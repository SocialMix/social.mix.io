/**
 * Created by dominic on 17/6/16.
 */
'use strict';

var winston = require('winston');
var util = require('util');
var config = require('../config/app.js');

var loggerConfig = {
    levels: {
        silly: 0,
        verbose: 1,
        info: 2,
        data: 3,
        warn: 4,
        debug: 5,
        error: 6,
        success: 7,
    },
    colors: {
        silly: 'magenta',
        verbose: 'cyan',
        info: 'cyan',
        data: 'grey',
        warn: 'yellow',
        debug: 'blue',
        error: 'red',
        success: 'green',
    }
};

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            colorize: 'all',
            timestamp: true,
        })
    ],
    levels: loggerConfig.levels,
    colors: loggerConfig.colors,
});


module.exports = {
    logger: logger
};
