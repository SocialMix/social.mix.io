/**
 * Created by dominic on 17/6/16.
 */

var app = require("express")(),
    http = require("http").Server(app),
    logger = require("./src/utils/logger"),
    config = require("./src/config/app");

http.listen(config.SERVER_PORT, function () {
    logger('info', 'Server Listening on PORT ', config.SERVER_PORT);

    process.on("uncaughtException", function (err) {
        logger('info', "Social Mix crashed, received uncaughtException Exception.", err);

        //If running in Cluster Mode Need time for the Application to Gracefully ShuttDown
        setTimeout(function () {
            process.exit(0);
        }, 0); //config.DAC_SHUTDOWN_SIGNAL_HANDLING_TIMEOUT);
    });

});