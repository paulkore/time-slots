module.exports = {
    ping: ping,
    getSheet: getSheet,
    signup: signup,
    clear: clear,
};

var svc = require('./signup_service');
var c = require('./common');

function ping(req, res) {
    res.json({
        response: 'PONG!',
        time: c.timestamp(),
    });
}

function getSheet(req, res) {
    res.json(svc.getSheetData());
}

function signup(req, res) {
    var body = req.body;

    // validate request data
    var errors = [];
    var dayIndex = c.strToInt(body.dayIndex);
    if (dayIndex === null || dayIndex < 0) {
        errors.push("Invalid or missing request argument: dayIndex");
    }
    var slotIndex = c.strToInt(body.slotIndex);
    if (slotIndex === null || slotIndex < 0) {
        errors.push("Invalid or missing request argument: slotIndex");
    }
    var memberName = c.trimStr(body.memberName);
    if (!memberName) {
        errors.push("Invalid or missing request argument: memberName");
    }
    var duration = c.trimStr(body.duration);
    if (!duration) {
        errors.push("Invalid or missing request argument: duration");
    }
    // console.log("REST arguments: " + dayIndex + ", " + slotIndex + ", " + memberName + ", " + duration);
    if (errors.length > 0) {
        res.status(400).send(errors); // HTTP 400 - bad request
        return;
    }

    // validation passed; attempt to do the signup
    svc.signup(dayIndex, slotIndex, memberName, duration,
        function() {
            // signup was successful, re-fetch the slot data
            res.json(svc.getSheetData());
        },
        function(userMessage) {
            // sign-up failed
            if (userMessage) {
                // if user message was provided, this is due to a bad selection by the user
                res.status(409).send({message: userMessage});
            }
            else {
                // if there's no message, this is a system error
                res.status(500).send({message: null});
            }
        });
}

function clear(req, res) {
    var body = req.body;

    // validate request data
    var errors = [];
    var memberName = c.trimStr(body.memberName);
    if (!memberName) {
        errors.push("Invalid or missing request argument: memberName");
    }
    // console.log("REST arguments: " + memberName);
    if (errors.length > 0) {
        res.status(400).send(errors); // HTTP 400 - bad request
        return;
    }

    svc.clear(memberName,
        function() {
            // clear was successful, re-fetch the slot data
            res.json(svc.getSheetData());
        },
        function(userMessage) {
            if (userMessage) {
                // if user message was provided, this is due to a bad selection by the user
                res.status(409).send({message: userMessage});
            }
            else {
                // if there's no message, this is a system error
                res.status(500).send({message: null});
            }
        });
}