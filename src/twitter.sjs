var Twitter = require('twitter');
var couchApi = require('./couch_trans_mgr');
var config = require('./config').root;

exports.initialSync = initialSync;
exports.getFeedfromCouch = getFeedfromCouch;
exports.deleteFeedfromCouch = deleteFeedfromCouch;
exports.syncFeed = syncFeed;

// This is the method that syncs Twitter feed everytime we hit it
task syncFeed(req, res) {
    catch (e) {
        console.log(e.stack);
        res.status(500).send('failure');
    }
    social_details <- req.db.SocialMapping.findOne({
        bizid: (req.user && req.user.bizid)
    });
    if (social_details) { // For syncing feed when already logged in
        var client = new Twitter({
            consumer_key: config.twitter.app.consumer_key,
            consumer_secret: config.twitter.app.consumer_secret,
            access_token_key: social_details.twitter.access_token_key,
            access_token_secret: social_details.twitter.access_token_secret
        });
        home_feed <- getHomeFeed(client, social_details.bizid, social_details.twitter.last_synched_id);
        social_details.twitter.last_synched_id = home_feed.last_id;
        social_details.twitter.last_modified = new Date();
        await social_details.save();
        res.send(home_feed);
    } else { // For first time login-fetch
        res.send(initialSync(req, res)); 
    }
}


//  This can be used for initial login-fetch action both 'explicitly' and on triggering syncFeed() for first time
 // Method requires following as body,
 //  {
 //    token: '',
 //    secret: ''
 //  }

task initialSync (req, res) {
    catch (e) {
        console.log(e.stack);
        res.status(500).send('failure');
    }

    // for debugging
    // req.body.token = req.body.token || "105393563-RwfyPCRayhjb5RlVVC97ASba0yFvqj8tgpHxMV4A";
    // req.body.secret = req.body.secret || "bX9rfpRjfphRBrLaMSeTRyLcuZ5x9AIkZlYHaHsIxAB45";
    // req.user.bizid = req.user.bizid || "venkat";

    req.body.token = req.body.token;
    req.body.secret = req.body.secret;
    req.user.bizid = req.user.bizid;

    social_details <- req.db.SocialMapping.findOne({bizid: req.user.bizid});

    var client = new Twitter({
        consumer_key: config.twitter.app.consumer_key,
        consumer_secret: config.twitter.app.consumer_secret,
        access_token_key: req.body.token,
        access_token_secret: req.body.secret
    });
    home_feed <- getHomeFeed(client, req.user.bizid, (social_details && social_details.twitter) ? social_details.twitter.last_synched_id : '');
    
    var twitter_mapping = {
        access_token_key: req.body.token,
        access_token_secret: req.body.secret,
        last_synched_id: home_feed.last_id,
        last_modified: new Date()
    };
    if (social_details) {
        social_details.twitter = twitter_mapping;
    } else {
        social_details = new req.db.SocialMapping({
            bizid: req.user.bizid,
            twitter: twitter_mapping
        });
    }
    await social_details.save();
    return home_feed;
}

/*
  Getting the logged in biz user home feed using twitter home_timeline api
*/

task getHomeFeed(client, bizid, last_id) {
    catch (e) {
        return {
            status: 'error',
            msg: err
        };
    }
    var tweet_limit = config.twitter.tweet_count;
    if (last_id) {
        err, home_timeline <<- client.get('statuses/home_timeline', {
            'since_id': last_id,
            'count' : tweet_limit
        });
    } else {
        err, home_timeline <<- client.get('statuses/home_timeline',{ 'count' : tweet_limit });
    }
    if (err) {
        throw err;
    } else {
        return {
            status: 'success',
            feed: home_timeline,
            bizid: bizid,
            last_id: home_timeline.length > 0 ? home_timeline[0].id : last_id
        };
    }
}

/*
  Getting the biz contact feed from twitte search api.
  This method takes contact twitter handle as input
*/

task getUserFeed(client, handle, bizid) {
    catch (e) {
        return {
            status: 'error',
            msg: e.stack
        };
    }
    err, user_feed <<- client.get('search/tweets', {
        q: handle,
        count: 20
    });
    if (err) {
        throw err;
    } else {
        return {
            status: 'success',
            feed: user_feed
        };
    }
}




task getFeedfromCouch() {
    catch (e) {
        console.log(e.stack);
    }
    getResp <- couchApi.getDocs({
        bucket: 'feed'
    });
    return getResp;
}

task deleteFeedfromCouch() {
    catch (e) {
        console.log(e.stack);
    }
    getResp <- couchApi.getDocs({
        bucket: 'feed'
    });

    if (getResp && getResp.body) {
        all_docs = JSON.parse(getResp.body).rows.map(function(doc) {
            return {
                id: doc.id,
                rev: doc.value.rev
            }
        });
        deleteResp <- couchApi.deleteDocs({
            bucket: 'feed',
            data: all_docs
        });
    }
    return getResp;
}

