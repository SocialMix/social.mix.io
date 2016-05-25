var jwt = require('jsonwebtoken');

exports.session = function(req, res, next) {
  var token = req.query.access_token || req.headers['x-access-token'] || req.query.state;
  if (!token) {
    var error = new Error("Access token missing");
    error.status = 403;
    return next(error);
  }
  jwt.verify(token, req.$.session.secret, function(err, obj) {
    if (err) {
      var error = new Error("Invalid access token");
      error.status = 403;
      return next(error);
    } else {
      req.db.User.findOne({bizid: obj.bizid || obj.device_id}).lean().exec(function(err, user) {
        if (!user) {
          req.user = {device_id: obj.device_id}; 
        }
        else {
          req.user = user;
          req.user.device_id = obj.device_id;
        }
        req.user.access_token = token;
        return next(err);
      });
    }
  });
};

exports.rawBody = function(req, res, next) {
  var data = '';

  req.setEncoding('utf8');

  req.on('data', function(chunk) {
    data += chunk;
  });

  req.on('end', function() {
    req.body = data;
    next();
  });
};
