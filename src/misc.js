var debug = require('debug')('sm-misc');

exports.route = function task_route(handler) {
    return function wrapped_route(req, res, next) {
        handler(req, res, function(err) {
          if (err && !res.headersSent) {
            next(err);
          }
        });
    };
};

