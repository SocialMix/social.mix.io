var express = require('express');
var router = express.Router();
var Limiter = require('ratelimiter');
var ms = require('ms');
var _ = require('lodash');

var misc = require('../src/misc');
var FeedHandler = require('../src/feed.sjs');
var rabbitmq = require('../src/rabbitmq.sjs');
var config = require('../src/config').root;

/*
 * This are the routes for the feed microservice as documented in
 * https://docs.google.com/a/imaginea.com/document/d/1xHogg9l3OXaTzesOyFde0XqrnDFit0yjXbu0XgjW9mQ/edit?usp=drive_web
 *
 * This exposes the basic Source and Rule APIs to start off with
 * Initially, the new crawlers will be ported to validate the idea
 *
 */

router.post('/source', misc.route(create_source));

task create_source(req, res) {
  req.validateRequiredFields(['_id, name, lambda_fn', 'input_source', 'hooks'], req.body);

  source <- req.db.FeedSource.create(req.body);
  res.json(source.toObject());
}

router.get('/source', misc.route(get_sources));

task get_sources(req, res) {
  res.json({status:"success"});
}

router.get('/source/:id/trigger', misc.route(trigger_source));

task trigger_source(req, res) {
  var id = req.params.id;

  // Rate limiter for feed. The max and duration will
  // come from the Source object loaded from db.
  var limiter = new Limiter({
     id: 'feed:source:' + id,
     db: req.redis,
     max: 1,
     duration: 86400000 // Only once per day
  });

  limit <- limiter.get();
  if (!limit.remaining) {
     var delta = (limit.reset * 1000) - Date.now() | 0;
     var after = limit.reset - (Date.now() / 1000) | 0;
     res.set('Retry-After', after);
     res.status(429);
     res.json({
       status: 'error',
       message: 'Rate limit exceeded, retry in ' + ms(delta, { long: true })
     });
     return false;
  }

  // TODO: Validate source id
  result <- FeedHandler.trigger(id, true);
  res.json({
    status: 'success',
    result: result
  });
}

router.post('/webhook/:id/trigger', misc.route(publish_msg));

task publish_msg(req, res){
  var msg = {
    id: req.params.id,
    body: req.body
  };
  var msgOptions = {
    persistent: true
  };
  // Default topics with which the webhook message need to be published
  // This basically refers to all independent rules which need to process message
  var topics = config.rabbitmq.topics.join(".");
  var ex = config.rabbitmq.exchange;

  result <- rabbitmq.publish(ex.name, topics, msg, msgOptions);
  res.json(result);
}

module.exports = router;
