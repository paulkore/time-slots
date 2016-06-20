var pg = require('pg');
var Transaction = require('pg-transaction');

module.exports = {
    connect: connect,
    beginTransaction: beginTransaction,
};

var dbURL = process.env.TIMESLOTS_DATABASE_URL;
if (!dbURL) {
    console.log('Required environment variable not set: TIMESLOTS_DATABASE_URL');
    process.exit(1);
}
pg.defaults.ssl = true;

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

/**
 * Starts a new database transaction in a given client session
 *
 * @param client The client session to start the transaction in
 * @param errorCallback The function to call on error (error object passed as argument)
 */
function beginTransaction(client, errorCallback) {
    var tx = new Transaction(client);
    tx.on('error', errorCallback);
    tx.begin();
    return tx;
}