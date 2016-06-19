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

/**
 * Establishes a connection and fetches rows returned from an SQL query.
 *
 * @param sql The text of the query with parameter placeholders, if any ($1, $2, $3, etc.)
 * @param params The parameter values to substitute into the placeholders (as array)
 *
 * @param successCallback The function to call on success (result rows array is passed as argument)
 * @param errorCallback The function to call on error (error message passed as argument)
 *
 * TODO: looks like this function is unnecessary
 */
function fetchRows(sql, params, successCallback, errorCallback) {
    pg.connect(dbURL, function(err, client) {
        if (err) {
            errorCallback('Database error: ' + err.message);
        }
        else {
            client
                .query(sql, params)
                .on('row', function (row, result) {
                    result.addRow(row);
                })
                .on('end', function (result) {
                    successCallback(result.rows);
                });
        }
    });
}

