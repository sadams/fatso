var testServerPort = 54322;
var fs = require('fs');
var server = require('../testServer');
var util = require('util');
var path = require('path');
var currentPath = path.dirname(module.filename);
var testRootPath = path.dirname(currentPath + '../');
var fatsoPath = path.dirname(testRootPath + '../') + '/fatso.js';
var exec = require('child_process').exec;

//server.start(testServerPort, testRootPath);

function getFullUrl(localPath) {
    return util.format('http://localhost:%d/%s', testServerPort, localPath)
}

function generateCommand(config) {
    return util.format("casperjs %s --json='%s'", fatsoPath, JSON.stringify(config));
}

//module.exports = {
//    setUp: function (callback) {
//        callback();
//    },
//    tearDown: function (callback) {
//        callback();
//    },
//    test1: function (test) {
//        test.equals(this.foo, 'bar');
//        test.done();
//    }
//};


testVisit = function(test){
  var url = getFullUrl('site/visit.html');
  var conf = {
    "steps":[
      {
          "type":"visit",
          "url":url
      }
    ]
  };
  console.log(generateCommand(conf));
  exec(generateCommand(conf), function(error, stdout, stderr) {
      console.log(stdout);
      var result = JSON.parse(stdout);
      test.equals(result.finalUrl, url);
      test.done();
  });
};

testSimpleExpression = function(test){
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
  };
  console.log(generateCommand(conf));
  exec(generateCommand(conf), function(error, stdout, stderr) {
    console.log(stdout);
    var result = JSON.parse(stdout);
    test.equals(result.jsExpressions[testVar], testVarExpectedValue);
    test.done();
  });
};
setUp = function (callback) {
  server.start(testServerPort, testRootPath);
  callback();
};
tearDown = function (callback) {
  server.stop();
  callback();
}
module.exports = {
  setUp                 : setUp,
  tearDown              : tearDown,
  testVisit             : testVisit,
  testSimpleExpression  : testSimpleExpression
}
//server.stop();
