module.exports = {
    TimeSlotsApp: TimeSlotsApp,
};

var express = require('express');
var fs = require('fs');
var moment = require('moment');
var svc = require('./data_service');


function TimeSlotsApp() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig) {
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating app ...', new Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', new Date(Date.now()));
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function() {
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        ['SIGHUP',
        'SIGINT',
        'SIGQUIT',
        'SIGILL',
        'SIGTRAP',
        'SIGABRT',
        'SIGBUS',
        'SIGFPE',
        'SIGUSR1',
        //'SIGUSR2', // <-- was interfering with Nodemon
        'SIGSEGV',
        //'SIGPIPE', // <-- from sample app: bugz 852598
        'SIGTERM'
        ].forEach(function(element) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */


    /**
     *  Initialize the server (express) with various configs
     */
    self.initializeServer = function() {
        self.app = express();

        self.port = process.env.PORT;
        if (!self.port) {
            self.port = 8081;
            console.warn('PORT environment variable not set, using default: ' + self.port);
        }

        self.app.set('json spaces', '  ');

        //CORS middleware
        var allowCrossDomain = function(req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        };

        self.app.configure(function() {
            self.app.use(express.bodyParser());
            self.app.use(express.cookieParser());
            // self.app.use(express.session({ secret: 'cool beans' }));
            self.app.use(express.methodOverride());
            self.app.use(allowCrossDomain);
            self.app.use(express.static('./app/client'));
        });

        // Create all the request routes
        self.createRoutes();
    };


    /**
     *  Initialize the application.
     */
    self.initialize = function() {
        self.setupTerminationHandlers();

        // Create the express server and routes
        self.initializeServer();

        // Populate the time-slot data model
        svc.initData();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        self.app.listen(self.port, function() {
            console.log('%s: Node server started on %s ...', new Date(Date.now()), self.port);
        });
    };


    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {

        self.app.get('/', function(req, res) {
            res.redirect("/index.html");
        });

        self.app.get('/signup', function(req, res) {
            res.redirect('signup.html');
        });

        self.app.get('/api/ping', function (req, res) {
            res.json({
                response: 'PONG!',
                time: timestamp(),
            });
        });

        self.app.get('/api/slots', function (req, res) {
            svc.fetchSlots(function(rows) {
                res.json(rows);
            });
        });

        self.app.post('/api/signup', function (req, res) {
            var body = req.body;

            var errors = [];
            var dayIndex = toInt(body.dayIndex);
            if (dayIndex === null || dayIndex < 0) {
                errors.push("Invalid or missing request argument: dayIndex");
            }
            var slotIndex = toInt(body.slotIndex);
            if (slotIndex === null || slotIndex < 0) {
                errors.push("Invalid or missing request argument: slotIndex");
            }
            var memberName = trim(body.memberName);
            if (!memberName) {
                errors.push("Invalid or missing request argument: memberName");
            }
            var duration = trim(body.duration);
            if (!duration) {
                errors.push("Invalid or missing request argument: duration");
            }

            // console.log("REST arguments: " + dayIndex + ", " + slotIndex + ", " + memberName + ", " + duration);
            if (errors.length > 0) {
                // bad request
                res.status(400).send(errors);
                return;
            }

            var result = svc.signup(dayIndex, slotIndex, memberName, duration);
            if (!result.success) {
                // sign-up failed
                if (result.userMessage) {
                    // if user message was provided, this is due to a bad selection by the user
                    res.status(409).send({message: result.userMessage});
                    return;
                }
                else {
                    // if there's no message, this is a system error
                    res.status(500).send({message: null});
                    return;
                }
            }

            // signup was successful, re-fetch the slot data
            svc.fetchSlots(function(data) {
                res.json(data);
            });
        });

        self.app.post('/api/clear', function (req, res) {
            var body = req.body;

            var errors = [];
            var memberName = trim(body.memberName);
            if (!memberName) {
                errors.push("Invalid or missing request argument: memberName");
            }

            // console.log("REST arguments: " + memberName);
            if (errors.length > 0) {
                // bad request
                res.status(400).send(errors);
                return;
            }

            var result = svc.clear(memberName);
            if (!result.success) {
                // sign-up failed
                if (result.userMessage) {
                    // if user message was provided, this is due to a bad selection by the user
                    res.status(409).send({message: result.userMessage});
                    return;
                }
                else {
                    // if there's no message, this is a system error
                    res.status(500).send({message: null});
                    return;
                }
            }

            // clear was successful, re-fetch the slot data
            svc.fetchSlots(function(data) {
                res.json(data);
            });
        });
    };

}

function timestamp() {
    return moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
}

function trim(str) {
    return str ? str.trim() : str;
}

function toInt(str) {
    if (str === undefined || str === null) return null;
    if (str === "0") return 0;
    return parseInt(str);
}
