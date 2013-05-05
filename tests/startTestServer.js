//this is just for us to spin up the test server for debugging the tests themselves.
var testServerPort = 54322;
var referringServerPort = 54323;
var server = require('./testServer');
var referringServer = require('./testServer');
var path = require('path');

//path that has the 'site' folder is a sibling of this file
var currentPath = path.dirname(module.filename);
server.start(testServerPort, currentPath);
referringServer.start(referringServerPort, currentPath);
console.log('Test Server Started: http://localhost:' + testServerPort);
console.log('Test Referring Server Started: http://localhost:' + referringServerPort);