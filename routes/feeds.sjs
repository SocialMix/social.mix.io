var express = require('express');
var router = express.Router();
var misc = require('../src/misc');
var FB = require('../src/fb');
var Twitter = require('../src/twitter');
var mw = require('./middleware');


/**
 * @api {post} /twitter/feed Generate Twitter Feed
 * @apiName TwitterCreateFeed
 * @apiGroup SocialFeed
 *
 * @apiParam {String} token Twitter access token (key) generated on user
 * Twitter authentication
 * @apiParam {String} secret Twitter access secret generated on user
 * Twitter authentication
 *
 * @apiSuccessExample {json} Response:
 *   HTTP/1.1 200 OK
 *   {
 *      "status": "success"
 *   }
 *
 * @apiErrorExample {json} Error:
 *   HTTP/1.1 403 Forbidden
 *   {
 *     "status": "error",
 *     "error": "Invalid access token"
 *   }
 */

router.post('/twitter/feed', function(req, res) {
    
    Twitter.initialSync(req, res, function(err, saveRes) {
        console.log('Twitter feed initialSync response : ', JSON.stringify(saveRes));
    });
    res.send({
        status: 'success'
    });

});

/**
 * @api {get} /twitter/sync_feed Sync Twitter Feed
 * @apiName syncFeed
 * @apiGroup SocialFeed
 *
 *
 * @apiSuccessExample {json} Response:
 *   HTTP/1.1 200 OK
 *   {
 *      "status": "success"
 *   }
 *
 * @apiErrorExample {json} Error:
 *   HTTP/1.1 500 Internal Server Error
 *   {
 *     "status": "failure"
 *   }
 */

router.get('/twitter/sync_feed', misc.route(Twitter.syncFeed));


module.exports = router;
