var jsforce = require('jsforce');
var couchTrans = require('./couch_trans_mgr');
var config = require('./config').root;

exports.getContacts = getContacts;
exports.getTasks = getTasks;
exports.querySalesforce = querySalesforce;
exports.persistToken = persistToken;

// Persisting access_token to establish connection next time
task persistToken (req, res, sf) {
  catch (e) {
    console.log(e.stack);
    throw e;
  }
  var bizid = req.user.bizid,
      device_id = req.user.device_id;
  // Upserting the tokens in db
  biz <- req.db.User.findOne({bizid: bizid || device_id});
  if (!biz) {
    var sf_details;
    sf_details = new req.db.User({
      bizid: bizid || device_id,
      salesforce: {
        access_token: sf.accessToken,
        instance_url: sf.instanceUrl,
        refresh_token: sf.refreshToken
      }
    });  
    await sf_details.save();
  }
  else {
    biz.salesforce =  {
      access_token: sf.accessToken,
      instance_url: sf.instanceUrl,
      refresh_token: sf.refreshToken
    };
    await biz.save();
  }
}

// SOQL util to query SF data
task querySalesforce (req, res, query) {
  catch (e) {
    console.log(e.stack);
    throw e;
  }
  var userdb = req.user.salesforce;

  if (!userdb) {
    biz <- req.db.User.findOne({
      bizid: req.user.bizid || req.user.device_id
    });
    userdb = biz.salesforce;
  }
  console.log('userdb - ', userdb);
  var conn = new jsforce.Connection({
    oauth2 : {
      clientId : config.salesforce.app.clientId,
      clientSecret : config.salesforce.app.clientSecret,
      redirectUri : config.salesforce.app.callbackUrl
    },
    accessToken: userdb && userdb.access_token,
    instanceUrl: userdb && userdb.instance_url,
    refreshToken: userdb && userdb.refresh_token
  });

  conn.on("refresh", function(accessToken, res) {
    // Refreshing the access token if it's expired
    done <- req.db.User.update({bizid: req.user.bizid}, {
      $set : {
        salesforce: {
          access_token: accessToken
        }
      }
    });
  });

  return conn.sobject(query.type)
   .select(query.select) 
   // .where("CreatedDate = TODAY") 
   // .limit(10)
   // .offset(20) // synonym of "skip"
   .execute(query.callback);
}

// Framing out contacts to fit couchbase schema
function frameContacts (req, contacts) {
  try {
    return contacts.map(function (contact, i) {
      return {
        type: "contact",
        bizid: req.user && req.user.bizid,
        device_id: req.user && req.user.bizid,
        first_name: contact.FirstName,
        last_name: contact.LastName,
        dob: contact.Birthdate,
        email: [{
          type: 'preferred',
          id: contact.Email
        }],
        phone: [{
          type: 'mobile',
          number: contact.MobilePhone
        }],
        note: contact.description,
        organization: [{
          name: contact.Department,
          role: contact.Title
        }],
        im: [{
            username: '',
            account_name: ''
        }],
        dates: [],
        websites: [],
        addresses: [{
            address: (function(c) {
              return (c.MailingStreet ? c.MailingStreet + ", " : "") + (c.MailingCity ? c.MailingCity + ", " : "") + (c.MailingState ? c.MailingState + ", " : "") + (c.MailingCountry ? c.MailingCountry + ", " : "")
            }(contact)),
            type: 'home'
        }],
        data_source: "salesforce",
        data_name: ""
      };
    });
  }
  catch (e) {
    console.log(e.stack);
  }
}
// Framing out contacts to fit couchbase schema
function frameTasks (req, tasks) {
  try {
    return tasks.map(function (task, i) {
      return {
        type: "contact_task",
        timestamp: new Date().getTime(),
        bizid: req.user && req.user.bizid,
        device_id: req.user && req.user.bizid,
        payload: {
          id: task.Id,
          date: new Date(task.ActivityDate).toISOString(),
          title: task.Subject,
          description: task.Description,
          status: task.Status,
          priority: task.Priority,
          created: new Date(task.CreatedDate).toISOString()
        }
      };
    });
  }
  catch (e) {
    console.log(e.stack);
  }
}
// Writing the cooked-up data to Couch
function couchWrite (bucket, data, writeDone) {
  var data1 = [];
  data1.push(data[0]);
  couchTrans.saveDocs(bucket, data1, function(err, response) {
    var ack = response.body;
    if (err) {
      console.log('Error in writing to couch - ', err);
    }
    if (writeDone) {
      if (ack.length) {
        writeDone(null, ack);
      }
      else {
        writeDone(err, ack);
      }
    }
  });
}

// GETs SF contacts
task getContacts (req, res) {
  var SUCCESS = 1,
      FAILURE = 3,
      EXISTS_ALREADY = 2;
  catch (e) {
      console.log(e.stack);
      res.status(500).send({
        status: 'failure',
        msg: 'Failed to import contacts',
        code: FAILURE
      });
  }
  var query = {
    type: 'Contact',
    select: '*, Account.*',
    callback: function(err, records) {
      if (err) {
        console.log(err, ' -- Error in conn.sobject');
      }
      couchWrite('contacts', frameContacts(req, records), function(error, saveResp) {
        if (error) {
          res.redirect(config.base_url + '?status=' + FAILURE); // Failure redirect
        }
        else {
          res.redirect(config.base_url + '?status=' + SUCCESS); // Success redirect 
        }
      });
    }
  };
  await querySalesforce(req, res, query);
}

// GETs SF tasks
task getTasks (req, res) {
  var SUCCESS = 1,
      FAILURE = 3,
      EXISTS_ALREADY = 2;
  catch (e) {
      console.log(e.stack);
      res.status(500).send({
        status: 'failure',
        msg: 'Failed to import tasks',
        code: FAILURE
      });
  }
  var query = {
    type: 'Task',
    select: '*, Account.*',
    callback: function(err, records) {
      if (err) {
        console.log(err, ' -- Error in conn.sobject');
      }
      couchWrite('feed', frameTasks(req, records), function(error, saveResp) {
        if (error) {
          // res.redirect(config.base_url + '?status=' + FAILURE); // Failure redirect
          return {
            status: 'error',
            code: FAILURE
          };
        }
        else {
          // res.redirect(config.base_url + '?status=' + SUCCESS); // Success redirect 
          return {
            status: 'success',
            code: SUCCESS
          };
        }
      });
    }
  };
  await querySalesforce(req, res, query);
}
