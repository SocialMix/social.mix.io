var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');

var sweet = require('sweet.js');
sweet.loadMacro('cspjs');

var config = require('./src/config').init();
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(logger('dev'));
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  req.$ = config;
  return next();
});

// Routes yet to be defined
var social_feed = require('./src/routes/feeds.sjs');

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  err.status = err.status || 500;
  res.status(err.status);
  res.json({
    status: 'error',
    code: err.status,
    error: err.message || err.toString(),
    stack: err.stack
  });
});


module.exports = app;
