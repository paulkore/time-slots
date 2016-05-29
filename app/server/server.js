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
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


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
        self.createRoutes();
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
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initialize the application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
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
     *  Populate the cache.
     *  TODO: This is not necessary, because we use the static-content serving feature
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = {
                'index.html': '',
                'hello.html': '',
            };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./app/client/index.html');
        self.zcache['hello.html'] = fs.readFileSync('./app/client/hello.html');
    };


    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        // TODO: forward to the static resource, no need for custom cache
        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };

        // TODO: forward to the static resource, no need for custom cache
        self.routes['/hello'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('hello.html') );
        };

        self.routes['/api/ping'] = function (req, res) {
          res.json({
            response: 'PONG!',
            time: moment().format("dddd, MMMM Do YYYY, h:mm:ss a"),
          });
        };

        self.routes['/api/slots'] = function (req, res) {
            svc.fetchSlots(function(rows) {
                res.json(rows);
            });
        };

    };

}