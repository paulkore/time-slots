module.exports = {
    initData: initData,
    getSlotDefs: getSlotDefs,
    getSlotsByDay: getSlotsByDay,
    getSlot: getSlot,
    getSlotSequence: getSlotSequence,
    updateSlot: updateSlot,
    clearForMember: clearForMember,
};



//==============================================================
//      In-memory data, that is not stored in the database
//




var slotDefs = null;

// TODO: Since this is in-memory, all signup information is lost upon application restart. Convert to a database!
var days = null;

// TODO: add protection against overwriting, if two users submit a signup request at the same time (use "version id").


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
    self.slots = null; // the array of time slots within this day

    self.copy = function() {
        var copy = new DayRecord();
        copy.id = self.id;
        copy.name = self.name;
        copy.slots = [];
        self.slots.forEach(function(slot) {
            copy.slots.push(slot.copy());
        });

        return copy;
    }
}

/** Represents one time slot, in a particular day */
function TimeSlotRecord() {
    var self = this;

    self.day = null; // the index of the day that this slot belongs to
    self.id = null; // the index of the time slot within the day
    self.peakTime = null; // "true" if this time slot is during "peak" hours
    self.chargeTime = null; // "true" if this time slot is required for charging the machine
    self.memberName = null; // the name of the member subscribed

    self.copy = function() {
        var copy = new TimeSlotRecord();
        copy.day = self.day;
        copy.id = self.id;
        copy.peakTime = self.peakTime;
        copy.chargeTime = self.chargeTime;
        copy.memberName = self.memberName;
        return copy;
    }
}

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

/** Creates all time slot records in every day of the week */
function createTimeSlots() {
    days.forEach(function(day, dayIdx) {
        slotDefs.forEach(function(slotDef, slotIdx) {
            var slot = new TimeSlotRecord();
            day.slots.push(slot);

            slot.day = dayIdx;
            slot.id = slotIdx;

            // Peak times: Mon-Thurs 9-11am, and 7-9pm
            var d = dayIdx; var t = slotDef.time;
            slot.peakTime = (d >= 1 && d <= 4) && ((t >= 9.0 && t < 11.0) || (t >= 19.0 && t < 21.0));
        });
    });
}

/** Retrieves a slot at the given coordinates. Live data - for internal use only! */
function getSlotInternal(dayIdx, slotIdx) {
    if (dayIdx < 0 || dayIdx >= days.length) return null;
    var slots = days[dayIdx].slots;
    if (slotIdx < 0 || slotIdx >= slots.length) return null;
    return slots[slotIdx];
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

// TODO: sample use
function fetchSlots(successCallback, errorCallback) {
    return fetchRows('select * from timeslot;', [], successCallback, errorCallback);
}

// TODO: sample use
function fetchSlotsForDay(dayIdx, successCallback, errorCallback) {
    return fetchRows('select * from timeslot where day_idx = $1', [dayIdx], successCallback, errorCallback);
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
                    console.log('Unexpected number of records: ' + count + ', expected: ' + expected);
                    clearAndInsertData();
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
                            console.log('... DONE');
                            client.end();
                        }
                    })

                });
            });
        }

    });
}








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
    createTimeSlots();

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
function getSlotsByDay() {
    var copy = []; days.forEach(function(day) {
        copy.push(day.copy());
    });
    return copy;
}

/**
 * Retrieves a slot at the given coordinates, or null if not found
 */
function getSlot(dayIdx, slotIdx) {
    var slot = getSlotInternal(dayIdx, slotIdx);
    return slot ? slot.copy : null;
}

/**
 * Retrieves a sequence of slots from a particular day, starting at the given coordinates.
 * The sequence is of the requested length, or less if there aren't enough slots in the day.
 * If the first slot if not found, null is returned.
 */
function getSlotSequence(dayIdx, slotIdx, length) {
    // console.log("getSlotSequence called with: "+dayIdx+", "+slotIdx+", "+length);

    if (dayIdx < 0 || dayIdx >= days.length) return null;
    var slots = days[dayIdx].slots;
    if (slotIdx < 0 || slotIdx >= slots.length) return null;
    var seq = [];
    for (var i=slotIdx; i<slots.length && seq.length < length; i++) {
        seq.push(slots[i].copy());
    }
    return seq;
}

/**
 * Updates a particular slot record
 *
 * @param weekIdx the week index
 * @param dayIdx the day index
 * @param slotIdx the slot index within the day
 * @param memberName the member name to set on this slot (null to clear)
 * @param chargeTime true/false whether this time slot is for charging (null to clear)
 */
function updateSlot(weekIdx, dayIdx, slotIdx, memberName, chargeTime) {
    var slot = getSlotInternal(dayIdx, slotIdx);
    if (!slot) return;
    slot.memberName = memberName;
    slot.chargeTime = chargeTime;
}

/**
 * Clears all slots registered under the given member name.
 * Returns false, if no such records were encountered.
 */
function clearForMember(memberName) {
    var found = false;
    days.forEach(function(day) {
        day.slots.forEach(function(slot) {
            if (slot.memberName === memberName) {
                slot.memberName = null;
                slot.chargeTime = null;
                found = true;
            }
        });
    });
    return found;
}





