var testServerPort = 54322;
var fs = require('fs');
var server = require('../testServer');
var util = require('util');
var basePath = fs.realpathSync();
var fatsoPath = fs.realpathSync('../fatso.js');
var exec = require('child_process').exec;
console.log(testServerPort);
server.start(testServerPort, basePath);

function getFullUrl(localPath) {
    return util.format('http://localhost:%d/%s', testServerPort, localPath)
}

function generateCommand(config) {
    return util.format("casperjs .js %s --json='%s'", fatsoPath, JSON.stringify(config));
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
exports.testVisit = function(test){
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
  exec(generateCommand(conf), function(response) {
      var result = JSON.parse(response);
      test.equals(result.finalUrl, url);
  });
//    test.expect(1);
//    test.ok(true, "this assertion should pass");
  test.done();
};

//exports.testSimpleExpression = function(test){
//    var conf = {
//        "jsExpressions": [
//            "tmPageId",
//            "TMAN._containers[0].tags.length"
//        ],
//        "requests": [
//            "google\\\\-analytics"
//        ],
//        "steps":[
//            {
//                "type":"setReferrer",
//                "url":"http://www.google.co.uk/"
//            },
//            {
//                "type":"visit",
//                "url":"http://eu.tagman.com/"
//            }
//        ]
//    };
//};
server.stop();
