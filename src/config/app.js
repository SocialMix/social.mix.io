/**
 * Created by dominic on 17/6/16.
 */
'use strict';

var _ = require('lodash'),
    config = null;

class Config {
    constructor() {
        if (config) {
            config = {
                set: (key, value)=> {

                },
                get: (key, defaultVal)=> {

                }
            };
        }
        return config;
    }

    inti(env) {

    }
}

Config.prototype.set = function (key, value) {
    return _.set(this, key, value);
};

Config.prototype.get = function (key, defaultVal) {
    return _.get(this, key, defaultVal);
};

exports.init = function (env) {
    env = env || process.env.ENV || 'local';
    debug("Loading configuration for env: %s", env);
    try {
        var config = require('../config/' + env + '.json');
    } catch (e) {
        console.log("Cannot load " + env + ".json config. Check if it exists");
        process.exit(1);
    }
    _.extend(config, new Config());

    // Override from ENV settings
    Object.keys(process.env).filter(function (key) {
        return key.indexOf(ENV_PREFIX) === 0 && process.env[key];
    }).forEach(function (key) {
        config.set(key.replace(ENV_PREFIX, ''), process.env[key]);
    });

    exports.root = config;

    return config;
};
