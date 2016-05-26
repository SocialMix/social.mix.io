var express = require('express');
var router = express.Router();
var httpRequest = require('request');

var config = require('../src/config').root;
var misc = require('../src/misc');
var mw = require('./middleware');
var jsforce = require('jsforce');
var salesforce = require('../src/salesforce');
