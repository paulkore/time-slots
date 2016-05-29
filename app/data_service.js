module.exports = {
	fetchSlots: fetchSlots
};

function fetchSlots(callback) {
	rows = [
	    {
	        id: 0,
	        week_id: 0,
	        date: '2016-05-29',
	        start_time: '11:00',
	        end_time: '12:00',
	        downtime: '2',
	    }
	];

	callback(rows);
}