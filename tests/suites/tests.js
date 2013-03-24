var testServerPort = 54322;
var fs = require('fs');
var server = require('../testServer');
var util = require('util');
var path = require('path');
var url = require('url');
var currentPath = path.dirname(module.filename);
var testRootPath = path.dirname(currentPath + '../');
var fatsoPath = path.dirname(testRootPath + '../') + '/fatso.js';
var exec = require('child_process').exec;

//test utilities
function getFullUrl(localPath) {
    return util.format('http://localhost:%d/%s', testServerPort, localPath)
}

function generateCommand(config) {
    return util.format("casperjs %s --json='%s'", fatsoPath, JSON.stringify(config));
}

function setUp(callback) {
  server.start(testServerPort, testRootPath);
  callback();
}

function tearDown(callback) {
  server.stop();
  callback();
}

function executeCommand(conf, callback) {
  exec(generateCommand(conf), function(error, stdout, stderr) {
    if (error !== null) {
      throw new Error('exec error: ' + error);
    }
    var json = JSON.parse(stdout)
    callback(json);
  });
}

//the tests
function testNoConfigThrowException(test){
  exec(generateCommand({}), function(error, stdout, stderr) {
    if (error === null) {
      test.ok(false, 'no error was returned from the empty config command');
    }
    test.done();
  });
}

function testVisit(test){
  var url = getFullUrl('site/visit.html');
  var conf = {
    "steps":[
      {
          "type":"visit",
          "url":url
      }
    ]
  };
  executeCommand(conf, function(result){
      test.equals(result.finalUrl, url);
      test.done();
  });
}

function testSimpleExpression(test){
  var url = getFullUrl('site/expression.html');
  var testVar = "xyz";
  var testVarExpectedValue = "foo";
  var conf = {
    "jsExpressions": [
      testVar
    ],
    "steps":[
      {
        "type":"visit",
        "url":url
      }
    ]
  }
  executeCommand(conf, function(result){
    test.equals(result.jsExpressions[testVar], testVarExpectedValue);
    test.done();
  });
};

function testRequests(test){
  var testPageUrl = getFullUrl('site/request.html');
  var imageRegex = "foo\\.png";
  var expectedImageRequest = "/site/foo.png";
  var scriptRegex = "bar\\.js";
  var expectedScriptRequest = "/site/bar.js";
  var jsImgRegex = "bing\\.jpg";
  var expectedJsImgRequest = "/site/bing.jpg";
  var conf = {
    "requests": [
      imageRegex,
      jsImgRegex,
      scriptRegex
    ],
    "steps":[
      {
        "type":"visit",
        "url":testPageUrl
      }
    ]
  }
  executeCommand(conf, function(result){
    test.equals(url.parse(result.requests[scriptRegex]).path, expectedScriptRequest);
    test.equals(url.parse(result.requests[imageRegex]).path, expectedImageRequest);
    test.equals(url.parse(result.requests[jsImgRegex]).path, expectedJsImgRequest);
    test.done();
  });
};



module.exports = {
  setUp                      : setUp,
  tearDown                   : tearDown,
  testNoConfigThrowException : testNoConfigThrowException,
  testVisit                  : testVisit,
  testSimpleExpression       : testSimpleExpression,
  testRequests               : testRequests
}
//server.stop();
