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
	var days = data.getDays();

	// add some additional fields to the returned data
	days.forEach(function(day) {
		day.slots.forEach(function(slot) {
			slot.isAvailableForUse = isAvailableForUse(slot);
			slot.isAvailableForCharging = isAvailableForCharging(slot);
		});
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
	if (!found && errorCallback) errorCallback("There were no bookings under this member's name");
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

