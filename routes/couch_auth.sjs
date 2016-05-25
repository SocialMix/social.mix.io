var async = require('async');
var request = require('request');
var config = require('../src/config').root;
var couchAdminHost = config.couch.sync.adminUrl;
var couchDbName = 'contacts/';
var couchDbs = config.couch.sync.db;
var couchSessionPath = '_session';
var couchUserPath = '_user/';
var bizid;

// This creates user sessions in Couchbase Sync Gateway in all databases given in config

task getSession(userid){
  if(!userid){
    throw new Error('Missing bizid to create session in Couchbase Sync Gateway');
  }
  bizid = userid;
  result <- async.map(couchDbs, createSession);
  return result;
}

function createSession(db, callback){
  var url = couchAdminHost + db + '/' + couchSessionPath;
  var data = {
    name: bizid
  };
  request({url: url, method: 'POST', json: data}, function(err, resp, body){
    if(err){
      callback(err, null);
    }
    if(resp.statusCode === 200){
      var data = {};
      data[db] = body;
      callback(null, data)
    }else if(resp.statusCode === 404){
      // User doesn't exist - create the user and retry creating session
      createUser(db, callback);
    }else{
      var errObj = {
        status: resp.statusCode,
        message: body
      }
      callback(errObj, null);
    }
  });
}

function createUser(db, callback){
  var url = couchAdminHost + db + '/' + couchUserPath;
  var userData = {
    name: bizid,
    admin_channels: [bizid]
  };
  request({url: url, method: 'POST', json: userData}, function(err, resp, body){
    if(err){
      callback(err, null);
    }
    if(resp.statusCode === 201){
      // User created successfully. Try creating a session
      createSession(db, callback);
    }else{
      var errObj = {
        status: resp.statusCode,
        message: body
      }
      callback(errObj, null);
    }
  })
}

exports.getSession = getSession;
