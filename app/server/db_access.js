module.exports = {
    connect: connect,
};

var pg = require('pg');
pg.defaults.ssl = true;

var dbURL = process.env.TIMESLOTS_DATABASE_URL;
if (!dbURL) {
    console.log('Required environment variable not set: TIMESLOTS_DATABASE_URL');
    process.exit(1);
}

/**
 * Establishes a connection to the database.
 *
 * @param errorCallback The function to call on error (error object passed as argument)
 * @param successCallback The function to call on success (client object passed as argument)
 */
function connect(errorCallback, successCallback) {
    pg.connect(dbURL, function(err, client) {
        if (err) {
            errorCallback(err);
        }
        else {
            successCallback(client);
        }
    });
}


