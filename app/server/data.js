module.exports = {
    initData: initData,
    getSlotDefs: getSlotDefs,
    getSlotsByDay: getSlotsByDay,
    getSlotSequence: getSlotSequence,
    bookSlotSequence: bookSlotSequence,
    clearForMember: clearForMember,
};

var c = require('./common');

// TODO: add protection against overwriting, if two users submit a signup request at the same time (use "version id").




//==============================================================
//      Data entities
//



/** Represents a definition of a time slot */
function TimeSlotDef() {
    var self = this;

    self.time = null; // the start time of the slot, represented as fractional hours
    self.displayTime = null; // the start time of the slot (human-readable)

    self.copy = function() {
        var copy = new TimeSlotDef();
        copy.time = self.time;
        copy.displayTime = self.displayTime;
        return copy;
    }
}

/** Represents one day in the week */
function DayRecord() {
    var self = this;

    self.id = null; // the day's index
    self.name = null; // the day's name
    self.slots = []; // the array of time slots within this day

    self.copy = function() {
        var copy = new DayRecord();
        copy.id = self.id;
        copy.name = self.name;
        copy.slots = [];
        return copy;
    }
}

/** Represents one time slot, in a particular day */
function TimeSlotRecord(row) {
    var self = this;

    self.week = null; // the index of the week that this slot belongs to
    self.day = null; // the index of the day that this slot belongs to
    self.id = null; // the index of the time slot within the day
    self.peakTime = null; // "true" if this time slot is during "peak" hours
    self.chargeTime = null; // "true" if this time slot is required for charging the machine
    self.memberName = null; // the name of the member subscribed

    if (row) { // optionally initialize from a DB row
        self.week = row.week_idx;
        self.day = row.day_idx;
        self.id = row.slot_idx;
        self.memberName = row.member_name;
        self.chargeTime = row.charge_time;
        self.peakTime = row.peak_time;
    }

    self.copy = function() {
        var copy = new TimeSlotRecord();
        copy.day = self.day;
        copy.id = self.id;
        copy.peakTime = self.peakTime;
        copy.chargeTime = self.chargeTime;
        copy.memberName = self.memberName;
        return copy;
    };

}


//==============================================================
//      In-memory data, that is not stored in the database
//


/** Contains the slot-definitions */
var slotDefs = null;
/** Contains the days of week */
var days = null;


/** Creates the time slot definitions */
function createSlotDefs() {
    slotDefs = [];

    /** helper function */
    function toDisplayTime(time, includePeriod) {
        var hours = Math.floor(time);
        var minutes = 60 * (time - hours);
        var period = ' a.m.';
        if (hours >= 12) {
            period = ' p.m.';
            if (hours > 12) hours -= 12;
        }
        var hh = hours.toFixed(0);
        var mm = minutes.toFixed(0);
        if (mm.length < 2) mm = '0' + mm;

        return hh + ':' + mm + (includePeriod ? period : '');
    }
    /** helper function */
    function toDisplayTimeRange(time1, time2) {
        var displayPeriod1 = time1 < 12 && time2 >= 12; // only display both AM/PM periods on the cusp
        var displayPeriod2 = true; // always display the period on the 2nd time
        return toDisplayTime(time1, displayPeriod1) + " - " + toDisplayTime(time2, displayPeriod2);
    }

    var id = 0;
    var startTime = 6.0;        // <-- Club opens at 6 a.m.
    while (startTime < 23.0) {  // <-- Club closes at 11 p.m.
        var slot = new TimeSlotDef();
        slotDefs.push(slot);

        slot.id = id;
        slot.time = startTime;

        var endTime = startTime + 0.5; // Every time slot is 1/2 an hour long
        slot.displayTime = toDisplayTimeRange(startTime, endTime);

        // for next slot
        id++; startTime = endTime;
    }
}


/** Creates all day records (will contain time slots) */
function createDays() {
    var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    days = [];
    daysOfWeek.forEach(function(dayName, dayIdx) {
        var day = new DayRecord();
        days.push(day);

        day.id = dayIdx;
        day.name = dayName;
        day.slots = [];
    });
}





//=============================================================
//      Data that is kept in the database
//



var pg = require('pg');
pg.defaults.ssl = true;

var dbURL = process.env.TIMESLOTS_DATABASE_URL;
if (!dbURL) {
    console.log('Required environment variable not set: TIMESLOTS_DATABASE_URL');
    process.exit(1);
}

/**
 * Initializes the database schema, and records (if necessary).
 * If the number of records matches the expected number, they are left as-is.
 */
function initDatabase() {

    /** Terminates the process on DB error, because there's no point in running the app if initialization fails */
    function killOn(err) {
        if (err) {
            console.error('Database error: ' + err.message);
            process.exit(1);
        }
    }

    pg.connect(dbURL, function(err, client) {
        killOn(err);

        console.log('Initializing database schema...');
        client.query('CREATE TABLE IF NOT EXISTS timeslot( ' +
                        'week_idx INT NOT NULL, ' +
                        'day_idx INT NOT NULL, ' +
                        'slot_idx INT NOT NULL, ' +
                        'PRIMARY KEY(week_idx, day_idx, slot_idx), ' +
                        'member_name CHAR(12), ' +
                        'charge_time BOOLEAN, ' +
                        'peak_time BOOLEAN ' +
                    ');',
            function(err, res) {
               killOn(err);

               checkData();
            });

        function checkData() {
            console.log('Checking state of data model...');
            client.query('SELECT * FROM timeslot', function(err, res) {
                killOn(err);

                var count = res.rows.length;
                var expected = days.length * slotDefs.length;

                if (count == 0) {
                    console.log('Data not initialized.');
                    insertData();
                }
                else if (count != expected) {
                    console.error('Unexpected number of records: ' + count + ', expected: ' + expected);
                    // clearAndInsertData();

                    // something is really wrong here... don't carry on
                    process.exit(1);
                }
                else {
                    console.log('Data already initialized. ');
                    client.end();
                }
            });
        }

        function clearAndInsertData() {
            console.log('Clearing all exisitng data...');
            client.query('DELETE FROM timeslot', function(err, res) {
                killOn(err);
                insertData();
            });
        }

        function insertData() {
            console.log('Inserting data records...');
            // TODO: Figure out a more efficient way to insert the records. This is too slow because each INSERT is committed separately.

            days.forEach(function(day, dayIdx) {
                var lastDay = (dayIdx === days.length - 1);

                slotDefs.forEach(function(slotDef, slotIdx) {
                    var lastSlot = (slotIdx === slotDefs.length - 1);

                    // Peak times: Mon-Thurs 9-11am, and 7-9pm
                    var d = dayIdx; var t = slotDef.time;
                    var peakTime = (d >= 1 && d <= 4) && ((t >= 9.0 && t < 11.0) || (t >= 19.0 && t < 21.0));

                    client.query('INSERT INTO timeslot (week_idx, day_idx, slot_idx, member_name, charge_time, peak_time) ' +
                        'values ($1, $2, $3, $4, $5, $6)', [0, dayIdx, slotIdx, null, null, peakTime], function (err, res) {
                        killOn(err);

                        if (lastDay && lastSlot) {
                            // commit data after the last statement finishes
                            console.log('Finished inserting data records');
                            client.end();
                        }
                    })

                });
            });
        }

    });
}

/**
 * Fetches rows returned from an SQL query.
 *
 * @param sql The text of the query with parameter placeholders, if any ($1, $2, $3, etc.)
 * @param params The parameter values to substitute into the placeholders (as array)
 * @param successCallback The function to call on success (result rows passed to this function)
 * @param errorCallback The function to call on error (error message passed as argument)
 */
function fetchRows(sql, params, successCallback, errorCallback) {
    pg.connect(dbURL, function(error, client) {
        if (error) {
            errorCallback('Database error: ' + error.message);
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

/**
 * Rolls back any un-committed transactions in a given session.
 *
 * TODO: verify if this even works...
 */
var rollback = function(client) {
    client.query('ROLLBACK', function() {
        client.end();
    });
};



//=============================================================
//      Public interface stars here
//


/**
 * Initializes the data model, if it doesn't exist yet.
 * This typically happens when the application runs for the first time.
 */
function initData() {
    createSlotDefs();
    createDays();
    initDatabase();
}

/**
 * Retrieves the time-slot definitions.
 * These define the separate time-slots that will be created to fill up a "day" in the sheet.
 *
 * @returns {Array}
 */
function getSlotDefs() {
    var copy = []; slotDefs.forEach(function(slotDef) {
       copy.push(slotDef.copy());
    });
    return copy;
}

/**
 * Retrieves all the available slots, grouped by their day.
 *
 * @returns {Array}
 */
function getSlotsByDay(successCallback, errorCallback) {
    var slotsByDay = []; days.forEach(function(day) {
        slotsByDay.push(day.copy());
    });

    fetchRows('SELECT * FROM timeslot ORDER BY week_idx, day_idx, slot_idx;', [],
        function(rows) { // success
            rows.forEach(function(row) {
                var slot = new TimeSlotRecord(row);
                var day = slotsByDay[row.day_idx];
                day.slots.push(slot);
            });

            successCallback(slotsByDay);
        },
        function(err) { // error
            errorCallback(err);
        }
    );
}


/**
 * Retrieves a sequence of slots from a particular day, starting at the given coordinates.
 * The sequence is of the requested length, or less if there aren't enough slots in the day.
 * If the first slot if not found, null is returned.
 *
 *
 */
function getSlotSequence(weekIdx, dayIdx, slotIdx, length, successCallback, errorCallback) {
    console.log("data.getSlotSequence(weekIdx="+weekIdx+", dayIdx="+dayIdx+", slotIdx="+slotIdx+", length="+length);

    fetchRows('SELECT * FROM timeslot WHERE week_idx = $1 AND day_idx = $2 and slot_idx >= $3 ' +
        'ORDER BY week_idx, day_idx, slot_idx LIMIT $4', [weekIdx, dayIdx, slotIdx, length],
        function(rows) {
            var seq = [];
            rows.forEach(function(row) {
                var slot = new TimeSlotRecord(row);
                seq.push(slot);
            });

            successCallback(seq);
        },
        function(err) { // error
            errorCallback(err);
        });
}

/**
 * Books a sequence of slots for a particular member;
 *
 * @param weekIdx The week index
 * @param dayIdx The day index
 * @param slotIdx The index of the first slot in the sequence
 * @param memberName The member name to set on this slot
 * @param slotsToUse The number of slots to mark for use
 * @param slotsToCharge The number of slots to mark for charging
 *
 * @param successCallback This function will be called upon success
 * @param errorCallback This function will be called upon error, with an error message
 */
function bookSlotSequence(weekIdx, dayIdx, slotIdx, memberName, slotsToUse, slotsToCharge, successCallback, errorCallback) {
    console.log("data.bookSlotSequence(weekIdx="+weekIdx+", dayIdx="+dayIdx+", slotIdx="+slotIdx+", memberName="+memberName+", slotsToUse="+slotsToUse+", slotsToCharge="+slotsToCharge);

    pg.connect(dbURL, function(err, client) {
        if (err) {
            errorCallback('Database error: ' + err.message);
        }
        else {
            var firstSlotIdx = slotIdx;
            var firstChargeIdx = slotIdx + slotsToUse;
            var lastSlotIdx = firstChargeIdx + slotsToCharge - 1;

            console.log("Updating slots: weekIdx="+weekIdx+", dayIdx="+dayIdx+", firstSlotIdx="+firstSlotIdx+", firstChargeIdx="+firstChargeIdx+", lastSlotIdx="+lastSlotIdx);

            client.query('UPDATE timeslot ' +
                'SET member_name = $6, ' +
                'charge_time = CASE WHEN slot_idx >= $5 THEN true ELSE false END ' +
                'WHERE week_idx = $1 AND day_idx = $2 AND slot_idx >= $3 AND slot_idx <= $4',
                [weekIdx, dayIdx, firstSlotIdx, lastSlotIdx, firstChargeIdx, memberName],
                    function (err, res) {
                        if (err) {
                            errorCallback('Database error: ' + err.message);
                        }
                        else {
                            console.log("Successfully updated slot sequence");
                            successCallback();
                        }
                    })

        }
    });

}

/**
 * Clears all slots registered under the given member name.
 *
 * @param memberName The name of the member whose bookings are to be cleared
 * @param successCallback This function will be called upon success, with a boolean argument
 *                        indicating whether any existing records were found, or not.
 * @param errorCallback This function will be called upon error, with an error message
 */
function clearForMember(memberName, successCallback, errorCallback) {
    console.log("data.clearForMember(memberName="+memberName+")");

    if (c.isEmptyStr(memberName)) {
        errorCallback("Invalid input - member name can't be empty");
        return;
    }

    fetchRows("SELECT * FROM timeslot WHERE member_name = $1", [memberName],
        function(rows) { // success
            if (rows.length === 0) {
                // no matching records were found
                successCallback(false);
            }
            else {
                pg.connect(dbURL, function(err, client) {
                    if (err) {
                        errorCallback('Database error: ' + err.message);
                    }
                    else {
                        client.query("UPDATE timeslot SET member_name = null, charge_time = null " +
                            "WHERE member_name = $1", [memberName],
                            function(err, res) {
                                if (err) {
                                    errorCallback('Database error: ' + err.message);
                                }
                                else {
                                    successCallback(true);
                                }
                            });
                    }
                });
            }
        },
        function(err) { // error
            errorCallback(err);
        }
    );
}





