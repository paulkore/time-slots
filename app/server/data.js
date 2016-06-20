var c = require('./common');
var en = require('./entities');
var def = require('./definitions');
var db = require('./db_access');

module.exports = {
    initDatabase: initDatabase,
    getSlotsByDay: getSlotsByDay,
    getSlotSequence: getSlotSequence,
    bookSlotSequence: bookSlotSequence,
    clearForMember: clearForMember,
};

/**
 * Initializes the database schema and populates it with records (only if necessary);
 * The process terminates if an error occurs during initialization.
 *
 * @param successCallback This function is called upon success
 */
function initDatabase(successCallback) {

    /**
     * Terminates the process on DB error, because there's no point in running the app if initialization fails
     */
    function dieOnError(err) {
        if (err) {
            console.error("Database error: " + err.message);
            console.error("<<< TERMINATING APPLICATION >>>");
            process.exit(1);
        }
    }

    var days = def.getDays();
    var slotDefs = def.getSlotDefs();


    db.connect(dieOnError, checkSchema);

    function checkSchema(client) {
        console.log('Verifying database schema...');
        client.query(
            'CREATE TABLE IF NOT EXISTS timeslot( ' +
            'week_idx INT NOT NULL, ' +
            'day_idx INT NOT NULL, ' +
            'slot_idx INT NOT NULL, ' +
            'PRIMARY KEY(week_idx, day_idx, slot_idx), ' +
            'member_name CHAR(12), ' +
            'charge_time BOOLEAN, ' +
            'peak_time BOOLEAN ' +
            ');',
            function (err) {
                dieOnError(err);
                checkDataModel(client);
            });
    }

    function checkDataModel(client) {
        console.log('Verifying data model...');
        client.query('SELECT * FROM timeslot', function (err, res) {
            dieOnError(err);

            var count = res.rows.length;
            var expected = days.length * slotDefs.length;

            if (count == 0) {
                console.log('Data model not initialized.');
                createDataModel(client);
            }
            else if (count != expected) {
                console.error('Unexpected number of records: ' + count + ', expected: ' + expected);
                process.exit(1); // Something is really wrong here - abort. Someone will have to take a look.
            }
            else {
                console.log('Data model already initialized. ');
                finish();
            }
        });
    }

    function createDataModel(client) {
        console.log("Starting database transaction...");
        var tx = db.beginTransaction(client, dieOnError);

        console.log('Inserting data records...');
        days.forEach(function (day, dayIdx) {
            slotDefs.forEach(function (slotDef, slotIdx) {
                // Peak times: Mon-Thurs 9-11am, and 7-9pm
                var d = dayIdx;
                var t = slotDef.time;
                var peakTime = (d >= 1 && d <= 4) && ((t >= 9.0 && t < 11.0) || (t >= 19.0 && t < 21.0));

                tx.query('INSERT INTO timeslot (week_idx, day_idx, slot_idx, member_name, charge_time, peak_time) ' +
                    'values ($1, $2, $3, $4, $5, $6)', [0, dayIdx, slotIdx, null, null, peakTime],
                    function(err) {
                        dieOnError(err);
                    });
            });
        });

        console.log("Committing database transaction...");
        tx.commit(function(err) {
            dieOnError(err);

            console.log("Transaction committed successfully");
            finish();
        });
    }

    function finish() {
        console.log("========================");
        console.log("  Application is ready  ");
        console.log("========================\n");

        successCallback();
    }
    
}

/**
 * Retrieves all the available slots, grouped by their day.
 *
 * @return {Array}
 */
function getSlotsByDay(successCallback, errorCallback) {
    var slotsByDay = def.getDays();

    /** reports a database error */
    function handleError(err) {
        errorCallback('Database error: ' + err.message);
    }

    db.connect(handleError, function(client) {
            client.query("SELECT * FROM timeslot ORDER BY week_idx, day_idx, slot_idx;", [],
                function(err, res) {
                    if (err) {
                        handleError(err);
                    }
                    else {
                        res.rows.forEach(function(row) {
                            var slot = new en.TimeSlotRecord(row);
                            var day = slotsByDay[slot.day];
                            day.slots.push(slot);
                        });

                        successCallback(slotsByDay);
                    }
                }
            );
        });
}


/**
 * Retrieves a sequence of slots from a particular day, starting at the given coordinates.
 * The sequence is of the requested length, or less if there aren't enough slots in the day.
 * If the first slot if not found, null is returned.
 *
 * @param weekIdx The week index
 * @param dayIdx The day index within the week
 * @param slotIdx The index of the first slot in the sequence
 * @param length The requested maximum length of the sequence
 *
 * @param successCallback This function will be called upon success
 * @param errorCallback This function will be called upon error, with an error message
 *
 */
function getSlotSequence(weekIdx, dayIdx, slotIdx, length, successCallback, errorCallback) {
    console.log("data.getSlotSequence(weekIdx="+weekIdx+", dayIdx="+dayIdx+", slotIdx="+slotIdx+", length="+length);

    /** reports a database error */
    function handleError(err) {
        errorCallback('Database error: ' + err.message);
    }

    db.connect(handleError, function(client) {
            client.query("SELECT * FROM timeslot WHERE week_idx = $1 AND day_idx = $2 and slot_idx >= $3 " +
                "ORDER BY week_idx, day_idx, slot_idx LIMIT $4", [weekIdx, dayIdx, slotIdx, length],

                function (err, res) {
                    if (err) {
                        handleError(err);
                    }
                    else {
                        var seq = []; res.rows.forEach(function (row) {
                            var slot = new en.TimeSlotRecord(row);
                            seq.push(slot);
                        });

                        successCallback(seq);
                    }
                });
        });
}

/**
 * Books a sequence of slots for a particular member;
 *
 * @param weekIdx The week index
 * @param dayIdx The day index within the week
 * @param slotIdx The index of the first slot in the sequence
 * @param memberName The member name to set on this slot
 * @param slotsToUse The number of slots to mark for use
 * @param slotsToCharge The number of slots to mark for charging
 *
 * @param successCallback This function will be called upon success
 * @param errorCallback This function will be called upon error, with an error message
 *
 * TODO: add collision-protection, for when two users submit a signup request at the same time
 */
function bookSlotSequence(weekIdx, dayIdx, slotIdx, memberName, slotsToUse, slotsToCharge, successCallback, errorCallback) {
    console.log("data.bookSlotSequence(weekIdx="+weekIdx+", dayIdx="+dayIdx+", slotIdx="+slotIdx+", memberName="+memberName+", slotsToUse="+slotsToUse+", slotsToCharge="+slotsToCharge);

    /** reports a database error */
    function handleError(err) {
        errorCallback('Database error: ' + err.message);
    }

    db.connect(handleError, function(client) {
            var firstSlotIdx = slotIdx;
            var firstChargeIdx = slotIdx + slotsToUse;
            var lastSlotIdx = firstChargeIdx + slotsToCharge - 1;

            console.log("Updating slots: weekIdx="+weekIdx+", dayIdx="+dayIdx+", firstSlotIdx="+firstSlotIdx+", firstChargeIdx="+firstChargeIdx+", lastSlotIdx="+lastSlotIdx);

            client.query('UPDATE timeslot ' +
                'SET member_name = $6, ' +
                'charge_time = CASE WHEN slot_idx >= $5 THEN true ELSE false END ' +
                'WHERE week_idx = $1 AND day_idx = $2 AND slot_idx >= $3 AND slot_idx <= $4',
                [weekIdx, dayIdx, firstSlotIdx, lastSlotIdx, firstChargeIdx, memberName],
                    function (err) {
                        if (err) {
                            handleError(err);
                        }
                        else {
                            console.log("Successfully updated slot sequence");
                            successCallback();
                        }
                    })

        });

}

/**
 * Clears all slots registered under the given member name.
 *
 * @param memberName The name of the member whose bookings are to be cleared
 *
 * @param successCallback This function will be called upon success, with a boolean argument
 *                        indicating whether any existing records were found, or not.
 *
 * @param errorCallback This function will be called upon error, with an error message
 */
function clearForMember(memberName, successCallback, errorCallback) {
    console.log("data.clearForMember(memberName="+memberName+")");

    if (c.isEmptyStr(memberName)) {
        errorCallback("Invalid input - member name can't be empty");
        return;
    }

    /** reports a database error */
    function handleError(err) {
        errorCallback('Database error: ' + err.message);
    }

    db.connect(handleError, checkExistingBookings);

    function checkExistingBookings(client) {
        client.query("SELECT * FROM timeslot WHERE member_name = $1", [memberName], function(err, res) {
            if (err) {
                handleError(err);
            }
            else if (res.rows.length === 0) {
                successCallback(false); // no existing bookings were found
            }
            else {
                clearExistingBookings(client);
            }
        });
    }

    function clearExistingBookings(client) {
        client.query("UPDATE timeslot SET member_name = null, charge_time = null WHERE member_name = $1", [memberName], function(err) {
            if (err) {
                handleError(err);
            }
            else {
                successCallback(true);
            }
        });
    }
}






