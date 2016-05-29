module.exports = {
	initData: initData,
	fetchSlots: fetchSlots,
};

var TimeSlot = function() {
	var self = this;

	self.day = null; // number: the index of the day that this slot belongs to
	self.id = null; // number: the index of the time slot within the day
	self.time = null; // number: the start time of the slot (24-hour), in 1/2 hour increments represented as .5
	self.peak = false; // boolean: true if this time slot is during "peak" hours
	self.reg_name = null; // string: the name of the person subscribed
	self.charge = false; // boolean: true if this time slot is required for charging the machine
};

var days = null;

function fetchSlots(callback) {
	callback(days);
}

function initData() {
	days = [
		[], // 0: Sunday
		[], // 1: Monday
		[], // 2: Tuesday
		[], // 3: Wednesday
		[], // 4: Thursday
		[], // 5: Friday
		[], // 6: Saturday
	];

	days.forEach(function(timeSlots, day) {

		// Club hours: 6am to 11pm
		var time = 6.0; 		// First time slot is at 6AM
		var lastSlotTime = 22.5; 	// Last slot is at 10:30PM

		var slotId = 0;
		while (time <= lastSlotTime) {
			var slot = new TimeSlot();
			timeSlots.push(slot);

			slot.id = slotId;
			slot.day = day;
			slot.time = time;

			// Peak times: Mon-Thurs 9-11am, and 7-9pm
			if (day == 0 || day == 2 || day == 3 || day == 4) {
				if ((time >= 9.0 && time <= 11.0) || (time >= 19.0 && time <= 21.0)) {
					slot.peak = true;
				}
			}

			// For next time slot
			slotId++;
			// Time slots available in 1/2 hour increments
			time += 0.5;
		}
	})
}

