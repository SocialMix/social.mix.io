var FB = require('fb');
var couchApi = require('./couch_trans_mgr');
var moment = require('moment');
var config = require('./config').root;


exports.initialSync = initialSync;
exports.syncFeed = syncFeed;

// This is the method that syncs FB feed everytime we hit it
task syncFeed(req, res) {
  catch (e) {
    console.log(e.stack);
    res.status(500).send('failure');
  }
  // var bizid = (req.user && req.user.bizid) || 'vinay';
  var bizid = req.user && req.user.bizid;
  social_details <- req.db.SocialMapping.findOne({
      bizid: bizid
  });
  if (social_details) {
    var access_token = social_details.fb.access_token;
    FB.setAccessToken(access_token);
    acc_resp <- FB.napi('/me');
    if (acc_resp) {
      var accountId = acc_resp.id;
      acc_page_resp <- FB.napi('/' + accountId + '/accounts');
      var pageIds = (acc_page_resp && acc_page_resp.data) ? getPageIdsFromAccInfo(acc_page_resp) : [];
      feed <- retrievFeed({
        acc_id : accountId,
        pageIds : pageIds,
        bizid : bizid,
        since : (social_details && social_details.fb) ? social_details.fb.since : ''
      });
      feed['bizid'] = bizid;
      var fb_mapping = {
        access_token: access_token,
        last_modified: new Date(),
        // TODO: FB api currently supports time format as yyyy-mm-dd only, for feed-sync. We should probably have some way to sync for varied time frame, but not with one-day difference.
        since : moment(new Date()).format('YYYY-MM-DD')
      };
      social_details.fb = fb_mapping;
      await social_details.save();
      res.send(feed);
    } else {
      res.send({
        status: 'error',
        msg: 'Error in retreiving account details'
      });
    }
  } else {
    res.send(initialSync(req, res));
  }
}

//  This can be used for initial login-fetch action both 'explicitly' and on triggering syncFeed() for first time
// Method requires following as body,
//  {
//    fb_access_token: ''
//  }

task initialSync(req, res) {
  catch (e) {
    console.log(e.stack);
    res.status(500).send('failure');
  }
  // var bizid = (req.user && req.user.bizid) || 'vinay';
  var bizid = req.user && req.user.bizid;
  var access_token = req.body.fb_access_token;
  FB.setAccessToken(access_token);
  acc_resp <- FB.napi('/me');
  if (acc_resp) {
    var accountId = acc_resp.id;
    acc_page_resp <- FB.napi('/' + accountId + '/accounts');
    var pageIds = (acc_page_resp && acc_page_resp.data) ? getPageIdsFromAccInfo(acc_page_resp) : [];
    social_details <- req.db.SocialMapping.findOne({bizid: bizid});
    feed <- retrievFeed({
      acc_id : accountId,
      pageIds : pageIds,
      bizid : bizid,
      since : (social_details && social_details.fb) ? social_details.fb.since : ''
    });
    var fb_mapping = {
      access_token: access_token,
      last_modified: new Date(),
      since : moment(new Date()).format('YYYY-MM-DD')
    };
    if (social_details) {
      social_details.fb = fb_mapping;
    } else {
    social_details = new req.db.SocialMapping({
      bizid: bizid,
      fb: fb_mapping
    });
    }
    await social_details.save();
    return feed;
  } else {
    return "error";
  }
}

task retrievFeed(params) {
  catch (e) {
    console.log(e.stack);
  }
  var feedResp = {
    acc_id: params.acc_id,
    pages: []
  };
  homeFeed <- getFeedData(params.acc_id,params.bizid,params.since);
  feedResp.home_feed = homeFeed;
  if (params.pageIds.length > 0) {
    for (var i = 0; i < params.pageIds.length; i++) {
      var pageId = params.pageIds[i];
      pageFeed <- getFeedData(pageId,params.bizid,params.since);
      feedResp.pages.push({
        id: pageId,
        feed: pageFeed
      });
    }
  }
  return feedResp;
}

function getPageIdsFromAccInfo(acc_page_resp) {
  var pageIds = acc_page_resp.data.map(function(page) {
    return page.id;
  });
  return pageIds;
}

/*
  Getting the feed infromation using fb feed api
*/

task getFeedData(objId,bizid,since) {
  catch (e) {
    console.log(e.stack);
  }
  var outResp = [],
    feed_limit = config.fb.feed_count;
  if(since) {
    feedResp <- FB.napi('/' + objId + '/feed?limit=' + feed_limit + '&since='+since);
  }
  else {
    feedResp <- FB.napi('/' + objId + '/feed?limit=' + feed_limit);
  }
  outResp = feedResp.data || [];
  return outResp;
}
