var express = require('express');
var router = express.Router();
var misc = require('../src/misc');
var FB = require('../src/fb');
var Twitter = require('../src/twitter');
var mw = require('./middleware');

/**
 * @api {post} /fb/feed Generate FB Feed
 * @apiName FBCreateFeed
 * @apiGroup SocialFeed
 *
 * @apiParam {String} fb_access_token Facebook access token generated on user
 * facebook authentication
 *
 * @apiParam {String} access_token
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

router.post('/fb/feed', mw.session, function(req, res) {
    /* Triggering the save feed method and not waiting execution control till
   the process completes
   */
    FB.initialSync(req, res, function(err, saveRes) {
        console.log('FB feed save Response : ', JSON.stringify(saveRes));
    });
    res.send({status: 'success'});
});

router.get('/fb/sync_feed', misc.route(FB.syncFeed));

/**
 * @api {post} /twitter/feed Generate Twitter Feed
 * @apiName TwitterCreateFeed
 * @apiGroup SocialFeed
 *
 * @apiParam {String} token Twitter access token generated on user
 * Twitter authentication
 * @apiParam {String} secret Twitter access secret generated on user
 * Twitter authentication
 * @apiParam {String} access_token
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

router.post('/twitter/feed', mw.session, function(req, res) {
    /* Triggering the save feed method and not waiting execution control till
   the process completes
   */
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


//TODO Test Api Will remove in future
router.get('/twitter/feed', function(req, res) {
    /* Triggering the save feed method and not waiting execution control till
   the process completes
   */
    Twitter.getFeedfromCouch(function(err, getRes) {
        //console.log('Twitter feed save Response : ',getRes);
        res.send(getRes);
    });

});


//TODO Test Api Will remove in future
router.delete('/twitter/feed', function(req, res) {
    /* Triggering the save feed method and not waiting execution control till
   the process completes
   */
    Twitter.deleteFeedfromCouch(function(err, getRes) {
        res.send(getRes);
    });

});



module.exports = router;
