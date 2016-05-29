module.exports = {
	initData: initData,
	fetchSlots: fetchSlots,
};

// TODO: using in-memory data for now. All signup information is lost upon application restart.
var allData = null;

function fetchSlots(callback) {
	callback(allData);
}

var TimeSlot = function() {
	var self = this;

	self.day = null; // number: the index of the day that this slot belongs to
	self.id = null; // number: the index of the time slot within the day
	self.time = null; // number: the start time of the slot, represented is fractional hours
	self.displayTime = null; // string: the start time of the slot (human-readable)
	self.peak = false; // boolean: true if this time slot is during "peak" hours
	self.reg_name = null; // string: the name of the person subscribed
	self.charge = false; // boolean: true if this time slot is required for charging the machine
};

function initData() {
	allData = {};

	var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

	// produce the array of time slot definitions
	allData.slots = [];
	var time = 6.0; 		// First time slot is at 6AM
	var closingTime = 23.0; // Club closes at 11PM
	var slotId = 0;
	while (time < closingTime) {
		var slot = new TimeSlot();
		allData.slots.push(slot);
		
		slot.id = slotId;
		slot.time = time;
		slot.displayTime = toDisplayTime(time);

		slotId++;
		time += 0.5; // Time slots come in 1/2 hour increments
	}

	// create time slots in every day of the week
	allData.days = [];
	daysOfWeek.forEach(function(dayName, dayIndex) {
		var dayData = {};
		allData.days.push(dayData);

		dayData.id = dayIndex;
		dayData.name = dayName;

		dayData.timeSlots = [];
		allData.slots.forEach(function(slot) {
			var timeSlot = new TimeSlot();
			dayData.timeSlots.push(timeSlot);

			timeSlot.id = slot.id;
			timeSlot.time = slot.time;
			timeSlot.day = dayIndex;

			// Peak times: Mon-Thurs 9-11am, and 7-9pm
			timeSlot.peak = (dayIndex >= 1 && dayIndex <= 4) &&
				((time >= 9.0 && time < 11.0) || (time >= 19.0 && time < 21.0));
		});
	});
}

function toDisplayTime(time) {
	var hours = Math.floor(time);
	var minutes = 60 * (time - hours);
	var am = "AM";
	if (hours >= 12) {
		am = "PM";
		if (hours > 12) hours -= 12;
	}
	var hh = hours.toFixed(0);
	var mm = minutes.toFixed(0);
	if (mm.length < 2) mm = "0" + mm;

	return hh + ":" + mm + " " + am;
}


