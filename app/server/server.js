module.exports = {
    TimeSlotsApp: TimeSlotsApp,
};

var express = require('express');
var fs = require('fs');
var data = require('./data');
var api = require('./api');


function TimeSlotsApp() {

    //  Scope.
    var self = this;

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

    /**
     *  Initialize and configure the Express server
     */
    self.initializeServer = function() {
        self.app = express();

        self.port = process.env.PORT;
        if (!self.port) {
            self.port = 8081;
            console.warn('PORT environment variable not set, using default: ' + self.port);
        }

        self.app.set('json spaces', '  ');

        // CORS middleware
        var allowCrossDomain = function(req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        };

        self.app.configure(function() {
            self.app.use(express.bodyParser());
            self.app.use(express.cookieParser());
            // self.app.use(express.session({ secret: 'cool beans' })); // TODO: enable password protection
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
        self.initializeServer();
        data.initData();
    };

    /**
     *  Start the application server.
     */
    self.start = function() {
        self.initialize();

        self.app.listen(self.port, function() {
            console.log('%s: Node server started on %s ...', new Date(Date.now()), self.port);
        });
    };

    /**
     *  Define the URL routes
     */
    self.createRoutes = function() {
        self.app.get('/', function(req, res) {
            res.redirect('index.html');
        });

        self.app.get('/signup', function(req, res) {
            res.redirect('signup.html');
        });

        self.app.get('/api/ping', function (req, res) {
            api.ping(req, res);
        });

        self.app.get('/api/sheet', function (req, res) {
            api.getSheet(req, res);
        });

        self.app.post('/api/signup', function (req, res) {
            api.signup(req, res);
        });

        self.app.post('/api/clear', function (req, res) {
            api.clear(req, res);
        });
    };

}
