module.exports = {
    TimeSlotDef: TimeSlotDef,
    DayRecord: DayRecord,
    TimeSlotRecord: TimeSlotRecord,
};


/**
 * Represents a definition of a single time slot
 */
function TimeSlotDef() {
    var self = this;

    /** The start time of the slot, represented as fractional hours */
    self.time = null;
    /** The start time of the slot, as a human-readable string */
    self.displayTime = null;

    self.copy = function() {
        var copy = new TimeSlotDef();
        copy.time = self.time;
        copy.displayTime = self.displayTime;
        return copy;
    }
}

/**
 * Represents one day in the week
 */
function DayRecord() {
    var self = this;

    /** The day's index in the week */
    self.id = null;
    /** The day's name */
    self.name = null;
    /** The array of time slots within this day */
    self.slots = [];

    /** Produces a copy of this entity */
    self.copy = function() {
        var copy = new DayRecord();
        copy.id = self.id;
        copy.name = self.name;
        copy.slots = [];
        return copy;
    }
}

/**
 * Represents one time slot, in a particular day.
 *
 * @param row (optional) A database row to initialize this object from
 */
function TimeSlotRecord(row) {
    var self = this;

    /** The index of the week that this slot belongs to */
    self.week = null;
    /** The index of the day that this slot belongs to */
    self.day = null;
    /** The index of the time slot within its day */
    self.id = null;
    /** The name of the member subscribed */
    self.memberName = null;
    /** This flag is TRUE if this time slot is within peak hours */
    self.peakTime = null;
    /** This flag is TRUE if this time slot is required for charging the machine */
    self.chargeTime = null;

    if (row) {
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