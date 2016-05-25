var express = require('express');
var router = express.Router();
var httpRequest = require('request');

var config = require('../src/config').root;
var misc = require('../src/misc');
var mw = require('./middleware');
var jsforce = require('jsforce');
var salesforce = require('../src/salesforce');

var couchApi = require('../src/couch_trans_mgr');

function constructQueryParams(queryParams) {
  return Object.keys(queryParams).map(function(key) {
    return [key, queryParams[key]].map(encodeURIComponent).join("=");
  }).join("&");
}

function getContacts(oauthDetails, callback) {
  var options = {
    url: oauthDetails.accessTokenUrl,
    headers: {
      Authorization: 'Basic ' + new Buffer(oauthDetails.appId + ':' + oauthDetails.appSecret).toString('base64')
    },
    rejectUnauthorized: false,
    json: true,
    form: {
      code: oauthDetails.code,
      redirect_uri: oauthDetails.callbackURL,
      grant_type: 'authorization_code'
    }
  };
  httpRequest.post(options, function(err, response, body) {
    if (err || body.error) {
      callback({
        error: 'AccesToken Error'
      }, body);
      return;
    }
    //-log.debug('oauth_accesstoken',body.access_token);
    var contactsApiUrl = oauthDetails.contactsApiUrl;
    var options = {
      url: contactsApiUrl,
      headers: {
        Authorization: 'Bearer ' + body.access_token
      },
      rejectUnauthorized: false,
      json: true
    };
    //We are Retrieving the contacts from Google/Outlook Contacts API using accessToken
    httpRequest.get(options, function(err, response, body) {
      callback(err, body);
    });
  });
}

/**
 * @api {get} /auth/google Google oAuth
 * @apiName Google oAuth
 * @apiGroup Contact
 *
 * @apiParam {String} access_token The token as query param `access_token`
 *   or header `x-access-token`
 *
 * @apiSuccessExample {redirect} Success:
 *   HTTP/1.1 201 Created
 *   Redirection to /?status=1 -- Contacts Imported
 *   Redirection to /?status=2 -- Contacts already exists
 *
 * @apiErrorExample {redirect} Error:
 *   HTTP/1.1 500 Internal Server Error
 *   Redirection to /?status=3 -- Importing Contacts failed
 */
router.get('/google', mw.session, function(req, res) {
  var authEndPoint = config.google.app.authEndPoint;
  var queryParams = constructQueryParams({
      client_id: config.google.app.appId,
      redirect_uri: config.google.app.callbackURL,
      scope: config.google.app.scope,
      response_type: 'code',
      bizid: req.user.bizid
  });
  var authURI = authEndPoint.concat('?').concat(queryParams);
  //log.debug('oauth_google_authURI',authURI);
  res.redirect(302, authURI);
});

//Handles the callback once the google has authenticated user
router.get('/google/callback', misc.route(task google_callback(req, res) {
  catch(e) {
    res.status(500).send({
      status: 'error',
      error: e.message || 'Error while importing the contacts'
    });
  }
  err, body <<- getContacts({
    accessTokenUrl: config.google.app.accessTokenUrl,
    appId: config.google.app.appId,
    appSecret: config.google.app.appSecret,
    code: req.query.code,
    callbackURL: config.google.app.callbackURL,
    contactsApiUrl: config.google.app.contactsApiUrl
  });
  if (err || body.error) {
    console.log('Error while fetching the contacts');
    throw new Error('Error while fetching the contacts');
  }
  var data = body.feed.entry;
  var imported_contacts = [];

  for(var i = 0 ; i < data.length ; i++) {
    var entry = data[i];
    if ('gd$email' in entry) {
      var params = {
        bucketName: 'contacts',
        bucketPwd: 'contacts',
        queryExp: "SELECT count(email) FROM contacts WHERE ANY contact IN contacts.email SATISFIES contact.id='"+entry.gd$email[0].address+"' END"
      };
      existingContact <- couchApi.getDocs(params);
      // Create contact if it not exists
      if(existingContact[0].$1 == 0) {
        var contact = {
          type: "contact",
          bizid: req.user.bizid,
          first_name: entry.title && entry.title.$t,
          last_name: "",
          dob: "",
          email: entry.gd$email.map(function(d) {
            return {
              type: d.rel ? d.rel.split('#')[1] : d.label,
              id: d.address
            };
          }),
          phone: entry.gd$phoneNumber ? entry.gd$phoneNumber.map(function(d) {
            return {
              type: d.rel && d.rel.split('#')[1],
              number: d.$t
            };
          }) : [],
          note: entry.content && entry.content.$t,
          organization: entry.gd$organization ? entry.gd$organization.map(function(d) {
            return {
              name: d.gd$orgName && d.gd$orgName.$t,
              role: d.gd$orgTitle && d.gd$orgTitle.$t
            };
          }) : "",
          im: entry.gd$im ? entry.gd$im.map(function(d) {
            return {
              username: d.address,
              account_name: d.protocol.split('#')[1]
            };
          }) : [],
          dates: [],
          websites: [],
          addresses: entry.gd$postalAddress ? entry.gd$postalAddress.map(function(d) {
            return {
              address: d.$t,
              type: d.rel.split('#')[1]
            };
          }) : [],
          data_source: "gmail",
          data_name: "",
          device_id: ""
        };
        imported_contacts.push(contact);
      }
    } else {
      console.log('oauth_google_ignore_contact, as the entry does not have email');
      //log.info('oauth_google_ignore_contact',{descr:'Ignoring the entry as it does not have email',entry:entry});
    }
  }
  if(imported_contacts.length) {
    var params = {
      data: imported_contacts,
      bucket: "contacts"
    };
    resp <- couchApi.createDocs(params);
    if(resp && resp.status == 'success') {
      res.redirect(301, 'http://localhost:3000?status=1'); // Success redirect
    } else {
      res.redirect(301, 'http://localhost:3000?status=3'); // Failure redirect
    }
  } else {
    console.log('Contacts already exists');
    res.redirect(301, 'http://localhost:3000?status=2'); // Contact already exists redirect
  }
}));

// APP credentials in Microsoft
var ms_credentials = {
    appId: config.microsoft.app.appId,
    //This is the ngrok uri, need to replace this.
    redirect_uri: config.microsoft.app.redirect_uri,
    scope: config.microsoft.app.scope,
    accessTokenUrl: config.microsoft.app.accessTokenUrl,
    appSecret: config.microsoft.app.appSecret,
    authEndPoint: config.microsoft.app.authEndPoint
};


/**
 * @api {get} /auth/microsoft Microsoft oAuth
 * @apiName Microsoft oAuth
 * @apiGroup Contact
 *
 * @apiParam {String} access_token The token as query param `access_token`
 *   or header `x-access-token`
 *
 * @apiSuccessExample {redirect} Success:
 *   HTTP/1.1 201 Created
 *   Redirection to /?status=1 -- Contacts Imported
 *   Redirection to /?status=2 -- Contacts already exists
 *
 * @apiErrorExample {redirect} Error:
 *   HTTP/1.1 500 Internal Server Error
 *   Redirection to /?status=3 -- Importing Contacts failed
 */
router.get('/microsoft', mw.session, function(req, res) {
  var authEndPoint = ms_credentials.authEndPoint;
  var queryParams = constructQueryParams({
      client_id: ms_credentials.appId,
      redirect_uri: ms_credentials.redirect_uri,
      scope: ms_credentials.scope.split(','),
      response_type: 'code'
  });
  var authURI = authEndPoint.concat('?').concat(queryParams);
  //log.debug('oauth_microsoft_authURI',authURI);
  res.redirect(302, authURI);
});

// Frames the email object as required from the outlook email object
function getEmails(entry) {
  var emails = [];
  for(var key in entry) {
    if(entry[key] != null) {
      emails.push({type: key, id: entry[key]});
    }
  }
  return emails;
}

//Handles the callback once the microsoft has authenticated user
router.get('/microsoft/callback', misc.route(task ms_callback(req, res) {
  catch(e) {
    res.status(500).send({
      status: 'error',
      error: e.message || 'Error while importing the contacts'
    });
  }
  err, body <<- getContacts({
    accessTokenUrl: ms_credentials.accessTokenUrl,
    appId: ms_credentials.appId,
    appSecret: ms_credentials.appSecret,
    code: req.query.code,
    callbackURL: ms_credentials.redirect_uri,
    contactsApiUrl: 'https://apis.live.net/v5.0/me/contacts?limit=200'
  });
  if (err || body.error) {
    console.log('Error while fetching the contacts');
    throw new Error('Error while fetching the contacts');
  }
  var data = body.data;
  var imported_contacts = [];
  for(var i = 0 ; i < data.length ; i++) {
    var entry = data[i];
    console.log(entry);
    if ('emails' in entry) {
      var params = {
        bucketName: 'contacts',
        bucketPwd: 'contacts',
        queryExp: "SELECT count(email) FROM contacts WHERE ANY contact IN contacts.email SATISFIES contact.id='"+entry.emails.preferred+"' END"
      };
      existingContact <- couchApi.getDocs(params);
      // Create contact if it not exists
      if(existingContact[0].$1 == 0) {
        var contact = {
          type: "contact",
          bizid: req.user.bizid,
          first_name: entry.first_name || '',
          last_name: entry.last_name || '',
          dob: "",
          email: getEmails(entry['emails']),
          phone: "",
          note: "",
          organization: "",
          im: "",
          dates: [],
          websites: [],
          addresses: [],
          data_source: "outlook",
          data_name: "",
          device_id: ""
        };
        imported_contacts.push(contact);
      }
    }
  }
  if(imported_contacts.length) {
    var params = {
      data: imported_contacts,
      bucket: "contacts"
    };
    resp <- couchApi.createDocs(params);
    if(resp && resp.status == 'success') {
      res.redirect(301, 'http://localhost:3000?status=1'); // Success redirect
    } else {
      res.redirect(301, 'http://localhost:3000?status=3'); // Failure redirect
    }
  } else {
    console.log('Contacts already exists');
    res.redirect(301, 'http://localhost:3000?status=2'); // Contact already exists redirect
  }
}));

// SALESFORCE
// ----------
// APP credentials in Salesforce
var sf_credentials = {

    clientId: config.salesforce.app.clientId,
    clientSecret: config.salesforce.app.clientSecret,
    appId: config.salesforce.app.orgId,
    callbackUrl: config.salesforce.app.callbackUrl,
    loginUrl: config.salesforce.app.loginUrl
};
var sf_oauth2 = new jsforce.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  loginUrl : sf_credentials.loginUrl,
  clientId : sf_credentials.clientId,
  clientSecret : sf_credentials.clientSecret,
  redirectUri : sf_credentials.callbackUrl
});

/**
 * @api {get} v1/oauth/salesforce Salesforce oAuth2
 * @apiName Salesforce oAuth2
 * @apiGroup Contact
 *
 * @apiParam {String} access_token The token as query param `access_token`
 *   or header `x-access-token`
 *
 * @apiSuccessExample {redirect} Success:
 *   HTTP/1.1 302 
 *   Redirection to salesforce authEndPoint
 *
 * @apiErrorExample {redirect} Error:
 *   HTTP/1.1 500 Internal Server Error
 *   Importing Contacts failed
 */
router.get('/salesforce', mw.session, function(req, res) {
  var authEndPoint = sf_oauth2.getAuthorizationUrl({scope: 'full refresh_token', state: req.user.access_token});
  res.redirect(302, authEndPoint);
});

//Handles the callback once the salesforce has authenticated user
router.get('/salesforce/callback', mw.session, misc.route(task sf_callback(req, res) {
  catch(e) {
    res.status(500).send({
      status: 'error',
      error: e.message || 'Error while importing the contacts'
    });
  }
  var conn = new jsforce.Connection({ oauth2 : sf_oauth2 });
  var code = req.query.code;
  
  if (code) {
    err,userInfo <<- conn.authorize(code);
    if (err) { return console.error(err); }


    // saving accessToken, instanceUrl & refreshToken in session & db for establishing connection next time
    await salesforce.persistToken(req, res, {
      accessToken: conn.accessToken,
      instanceUrl: conn.instanceUrl,
      refreshToken: conn.refreshToken
    });

    // To retreive sf Contacts
    await salesforce.getContacts(req, res);
    // To retreive sf Tasks
    await salesforce.getTasks(req, res);
  }
}));

/**
 * @api {get} v1/oauth/salesforce/contacts Salesforce Contacts
 * @apiName Salesforce Contacts
 * @apiGroup Contact
 *
 * @apiParam {String} access_token The token as query param `access_token`
 *   or header `x-access-token`
 *
 * @apiParam {String} sfAccessToken The token as query param `sfAccessToken` of salesforce
 * @apiParam {String} sfInstanceUrl The token as query param `sfInstanceUrl` of salesforce
 *
 * @apiSuccessExample {redirect} Success:
 *   HTTP/1.1 200 OK 
 *   {
 *       status: 'success',
 *       msg: 'Contacts are imported successfully'
 *   }
 *
 * @apiErrorExample {redirect} Error:
 *   HTTP/1.1 500 Internal Server Error
 *   {
 *       status: 'failure',
 *       msg: 'Failed to import contacts'
 *   }
 */
router.get('/salesforce/contacts', misc.route(salesforce.getContacts));

/**
 * @api {get} v1/oauth/salesforce/tasks Salesforce Tasks
 * @apiName Salesforce Tasks
 * @apiGroup SocialFeed
 *
 * @apiParam {String} access_token The token as query param `access_token`
 *   or header `x-access-token`
 *
 * @apiParam {String} sfAccessToken The token as query param `sfAccessToken` of salesforce
 * @apiParam {String} sfInstanceUrl The token as query param `sfInstanceUrl` of salesforce
 *
 * @apiSuccessExample {redirect} Success:
 *   HTTP/1.1 200 OK 
 *   {
 *       status: 'success',
 *       msg: 'Tasks are imported successfully'
 *   }
 *
 * @apiErrorExample {redirect} Error:
 *   HTTP/1.1 500 Internal Server Error
 *   {
 *       status: 'failure',
 *       msg: 'Failed to import tasks'
 *   }
 */
router.get('/salesforce/tasks', misc.route(salesforce.getTasks));

module.exports = router;
