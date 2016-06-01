#!/bin/env node
var server = require('./app/server/server');

/**
 *  Main executable section (this is where the app starts)
 */
var app = new server.TimeSlotsApp();
app.start();