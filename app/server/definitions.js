var en = require('./entities');

module.exports = {
    getDays: getDays,
    getSlotDefs: getSlotDefs,
};


/**
 * Contains the days-of-week definitions
 */
var days = null;

/**
 * Initializes the days-of-week definitions
 */
new function() {
    var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    days = [];
    daysOfWeek.forEach(function(dayName, dayIdx) {
        var day = new en.DayRecord();
        days.push(day);

        day.id = dayIdx;
        day.name = dayName;
        day.slots = [];
    });
}(); // call immediately

/**
 * Retrieves the day-of-week definitions.
 * @return {Array}
 */
function getDays() {
    var daysCopy = []; days.forEach(function(day) {
        daysCopy.push(day.copy());
    });
    return daysCopy;
}



/**
 * Contains the time-slot definitions. These define the separate time-slots
 * that are created to fill up a "day" in the sheet.
 */
var slotDefs = null;

/**
 * Initializes the time-slot definitions.
 */
new function() {
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
        var slot = new en.TimeSlotDef();
        slotDefs.push(slot);

        slot.id = id;
        slot.time = startTime;

        var endTime = startTime + 0.5; // Every time slot is 1/2 an hour long
        slot.displayTime = toDisplayTimeRange(startTime, endTime);

        // for next slot
        id++; startTime = endTime;
    }

}(); // call immediately

/**
 * Retrieves the time-slot definitions.
 * @return {Array}
 */
function getSlotDefs() {
    var slotDefsCopy = []; slotDefs.forEach(function(slotDef) {
        slotDefsCopy.push(slotDef.copy());
    });
    return slotDefsCopy;
}