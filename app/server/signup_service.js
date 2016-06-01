module.exports = {
	getSheetData: getSheetData,
	signup: signup,
	clear: clear,
};

var data = require('./data');


/**
 * Returns the current state of the signup sheet
 */
function getSheetData() {
	var slotDefs = data.getSlotDefs();
	var daysData = data.getDays();

	var days = [];
	daysData.forEach(function(dayData) {
		var day = {
			id: dayData.id,
			name: dayData.name,
			slots: [],
		};
		days.push(day);

		// combine adjacent identical slots for better presentation
		var currentSlot = null;
		function pushCurrentSlot() {
			if (currentSlot) {
				currentSlot.heightClass = 'slot-height-'+currentSlot.height;
				day.slots.push(currentSlot);
				currentSlot = null;
			}
		}

		dayData.slots.forEach(function(slot) {
			if (slotsCanBeGrouped(currentSlot, slot)) {
				currentSlot.height += 1;
			}
			else {
				pushCurrentSlot();

				// start a new slot
				currentSlot = slot;
				currentSlot.isAvailableForUse = isAvailableForUse(slot);
				currentSlot.isAvailableForCharging = isAvailableForCharging(slot);
				currentSlot.height = 1; // for grouping purposes
			}
		});

		// push the last slot, if it exists
		pushCurrentSlot();
	});

	return {
		slotDefs: slotDefs,
		days: days,
	}
}

/**
 * Attempts to sign up a member for a given duration, starting at a given time slot
 */
function signup(dayIndex, slotIndex, memberName, duration, successCallback, errorCallback) {
	//console.log("signup called with: "+dayIndex+", "+slotIndex+", "+memberName+", "+duration);

	var slotsToUse = null;
	if (duration === "1/2") slotsToUse = 1;
	if (duration === "1") slotsToUse = 2;
	if (slotsToUse === null) {
		// console.log("system error: unsupported duration value");
		if (errorCallback) errorCallback();
		return;
	}

	// for every slot of machine use, there are 2 slots of charge time
	var slotsToCharge = slotsToUse * 2;
	var totalSlots =  slotsToUse + slotsToCharge;

	var slots = data.getSlotSequence(dayIndex, slotIndex, totalSlots);
	if (!slots || slots.length == 0) {
		// console.log("system error: failed to produce slot sequence");
		if (errorCallback) errorCallback();
		return;
	}
	// console.log("Retrieved sequence of " + slots.length + " slots");

	var slotsToUpdate = [];
	for (var i=0; i<slotsToUse; i++) {
		if (i >= slots.length) {
			if (errorCallback) errorCallback("Not enough time in the given selection, please try another slot");
			return;
		}
		if (!isAvailableForUse(slots[i])) {
			if (errorCallback) errorCallback("Unavailable slot in the given selection, please try another slot");
			return;
		}
		slotsToUpdate.push(slots[i]);
	}

	for (var j=slotsToUse; j<totalSlots; j++) {
		if (j >= slots.length) {
			break; // this is fine - machine will be charging past closing hours
		}
		if (!isAvailableForCharging(slots[j])) {
			if (errorCallback) errorCallback("Not enough time to charge, please try another slot");
			return;
		}
		slotsToUpdate.push(slots[j]);
	}

	// finally, update the slots accordingly
	slotsToUpdate.forEach(function(slot, index) {
		var isCharging = index >= slotsToUse;
		data.updateSlot(slot.day, slot.id, memberName, isCharging);
	});

	// console.log("Signup successful");
	if (successCallback) successCallback();
}

/**
 * Attempts to clear all bookings by a certain member
 */
function clear(memberName, successCallback, errorCallback) {
	//console.log("Clear called with: " + memberName);
	var found = data.clearForMember(memberName);
	if (found && successCallback) successCallback();
	if (!found && errorCallback) errorCallback("There are no bookings under this member's name");
}

/**
 * (Helper function)
 * returns true if the machine is available for use in a given time slot
 */
function isAvailableForUse(slot) {
	return !slot.memberName && !slot.chargeTime && !slot.peakTime;
}

/**
 * (Helper function)
 * returns true if the machine can be charged in a given time slot
 */
function isAvailableForCharging(slot) {
	return !slot.memberName && !slot.chargeTime; // charging can happen during peak time
}

/**
 * (Helper function)
 * returns true if the given slots can be "grouped" into one slot for presentation purposes
 */
function slotsCanBeGrouped(slot1, slot2) {
	if (slot1 == null || slot2 == null) {
		// not applicable
		return false;
	}

	if (slot1.peakTime && slot2.peakTime) {
		return true;
	}
	if (slot1.peakTime === true ^ slot2.peakTime === true) {
		// a change in peak time status trumps all "groupable" states
		return false;
	}

	function isBooked(slot) {return slot.memberName && !slot.chargeTime};
	function isCharging(slot) {return slot.memberName && slot.chargeTime};

	if (slot1.memberName === slot2.memberName) {
		if (isBooked(slot1) && isBooked(slot2)) {
			return true;
		}
		if (isCharging(slot1) && isCharging(slot2)) {
			return true;
		}
	}

	return false;
}


