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
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.host = process.env.OPENSHIFT_NODEJS_HOST;
        self.port = process.env.OPENSHIFT_NODEJS_PORT;

        //  Log errors on OpenShift but continue w/ 127.0.0.1
        //  This allows us to run/test the app locally.
        if (typeof self.host === "undefined") {
            self.host = "127.0.0.1";
            console.warn('No OPENSHIFT_NODEJS_HOST var, using ' + self.host);
        }
        if (typeof self.port === "undefined") {
            self.port = 8081;
            console.warn('No OPENSHIFT_NODEJS_PORT var, using ' + self.port);
        }
    };

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
        self.app.set('json spaces', '  ');

        //CORS middleware
        var allowCrossDomain = function(req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        };

        self.app.configure(function() {
            // self.app.use(express.bodyParser());
            // self.app.use(express.cookieParser());
            // self.app.use(express.session({ secret: 'cool beans' }));
            self.app.use(express.methodOverride());
            self.app.use(allowCrossDomain);
            // self.app.use(app.router);
            self.app.use(express.static('./app/client'));
        });

        //  Add handlers for the app (from the routes).
        var routes = self.createRoutes();
        for (var url in routes) {
            self.app.get(url, routes[url]);
        }
    };


    /**
     *  Initialize the application.
     */
    self.initialize = function() {
        self.setupVariables();
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
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.host, function() {
            console.log('%s: Node server started on %s:%d ...', new Date(Date.now()), self.host, self.port);
        });
    };


    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        var routes = { };

        routes['/'] = function(req, res) {
            res.redirect("/index.html");
        };
        routes['/hello'] = function(req, res) {
            res.redirect('hello.html');
        };

        routes['/api/ping'] = function (req, res) {
            res.json({
                response: 'PONG!',
                time: moment().format("dddd, MMMM Do YYYY, h:mm:ss a"),
            });
        };

        routes['/api/slots'] = function (req, res) {
            svc.fetchSlots(function(rows) {
                res.json(rows);
            });
        };

        return routes;
    };

}
