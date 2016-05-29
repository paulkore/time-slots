module.exports = {
	fetchWeeks: fetchWeeks,
	fetchBookings: fetchBookings,
}

var pg = require('pg');

var dbURL = process.env.TIMESLOTS_DATABASE_URL;
if (!dbURL) {
	console.log('Required environment variable not set: TIMESLOTS_DATABASE_URL');
//	process.exit(1);
} 

function fetchRows(sql, params, callback) {
	pg.connect(dbURL, function(err, client) {
	  if (err) throw err;
	  client
	    .query(sql, params)
	    .on('row', function(row, result) {
	    	result.addRow(row);
	    })
	    .on('end', function(result) {
	    	callback(result);
	    });
	});
}

function fetchWeeks(callback) {
    /*
	fetchRows('select * from weeks order by id asc;', [], function(result) {
		callback(result.rows)
	});
	*/

	rows = [
	    {
	        id: 0,
	        update: 0,
	        first_day: '2016-05-29'
	    },
	    {
            id: 1,
            update: 0,
            first_day: '2016-06-05'
        },
        {
            id: 2,
            update: 0,
            first_day: '2016-06-12'
        },
	];

	callback(rows);
}

function fetchBookings(weekId, callback) {
    /*
	fetchRows('select * from bookings where week_id = $1;', [sheetId], function(result) {
		callback(result.rows)
	});
	*/

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