var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');

var sweet = require('sweet.js');
sweet.loadMacro('cspjs');

var config = require('./src/config').init();

// Initialize RabbitMQ exchanges & queues
require('./src/rabbitmq.sjs').init();

var db = require('./src/db').connect(config.get('db.url'));
var redis = require('./src/redis').connect(config.get('redis.host'));

// require('./src/mailer').init();
var auth = require('./routes/auth.sjs');
var oauth = require('./routes/oauth.sjs');
var contacts = require('./routes/contacts.sjs');
var send_cards = require('./routes/send_cards.sjs');
var ping = require('./routes/ping.sjs');
var social_feed = require('./routes/social_feed.sjs');
var jobs = require('./routes/jobs.sjs');
// require('./jobs/queue.sjs').init(config);
var feed = require('./routes/feed.sjs');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(logger('dev'));
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  req.$ = config;
  req.db = db.models;
  req.$db = db.db;
  req.redis = redis;
  return next();
});


// Validate required fields
app.use(function(req, res, next) {
	req.validateRequiredFields = function validateRequiredFields(fields, obj) {
		obj = obj || req.body;
		fields.forEach(function(field) {
			if (typeof obj[field] === 'undefined') {
				var error = new Error("Required field " + field + " missing");
				error.status = 400;
				throw error;
			}
		});
	};
	return next();
});

// Routes
app.use('/v1', auth);
app.use('/v1/oauth', oauth);
app.use('/v1', contacts);
app.use('/v1/cards', send_cards);
app.use('/v1/jobs', jobs);
app.use('/v1/ping', ping);
app.use('/v1/social', social_feed);
app.use('/v1/feed', feed);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  err.status = err.status || 500;
  res.status(err.status);
  res.json({
    status: 'error',
    code: err.status,
    error: err.message || err.toString(),
    stack: err.stack
  });
});


module.exports = app;
