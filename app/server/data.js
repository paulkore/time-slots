module.exports = {
    initData: initData,
    getSlotDefs: getSlotDefs,
    getDays: getDays,
    getSlot: getSlot,
    getSlotSequence: getSlotSequence,
    updateSlot: updateSlot,
    clearForMember: clearForMember,
};

// TODO: using in-memory data for now. All signup information is lost upon application restart.
var slotDefs = null;
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

/** Creates all day records time slot records in every day of the week */
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

function initData() {
    createSlotDefs();
    createDays();
    createTimeSlots();
}

function getSlotDefs() {
    var copy = []; slotDefs.forEach(function(slotDef) {
       copy.push(slotDef.copy());
    });
    return copy;
}

function getDays() {
    var copy = []; days.forEach(function(day) {
        copy.push(day.copy());
    });
    return copy;
}

function getSlotInternal(dayIdx, slotIdx) {
    if (dayIdx < 0 || dayIdx >= days.length) return null;
    var slots = days[dayIdx].slots;
    if (slotIdx < 0 || slotIdx >= slots.length) return null;
    return slots[slotIdx];
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





