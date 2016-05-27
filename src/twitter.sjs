var Twitter = require('twitter');
var config = require('./config').root;

exports.initialSync = initialSync;
exports.syncFeed = syncFeed;

// This is the method that syncs Twitter feed everytime we hit it
task syncFeed(req, res) {
    catch (e) {
        console.log(e.stack);
        res.status(500).send('failure');
    }
   
}


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
    req.body.token = req.body.token || "105393563-RwfyPCRayhjb5RlVVC97ASba0yFvqj8tgpHxMV4A";
    req.body.secret = req.body.secret || "bX9rfpRjfphRBrLaMSeTRyLcuZ5x9AIkZlYHaHsIxAB45";
    req.user.smid = req.user.smid || "venkat";


    var client = new Twitter({
        consumer_key: config.twitter.app.consumer_key,
        consumer_secret: config.twitter.app.consumer_secret,
        access_token_key: req.body.token,
        access_token_secret: req.body.secret
    });
    home_feed <- getHomeFeed(client, req.user.smid);
    
    return home_feed;
}



task getHomeFeed(client, smid) {
    catch (e) {
        return {
            status: 'error',
            msg: e.stack
        };
    }
    
}
