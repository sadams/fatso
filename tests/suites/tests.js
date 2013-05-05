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
var JSHINT = require("jshint").JSHINT;
var _ = require('underscore');
var connect = require('connect');

//test utilities
function forEach(obj, fn){
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      var val = obj[prop];
      fn.call(val, val, prop);
    }
  }
}

function getFullUrl(localPath, port) {
  port = _.isUndefined(port) ? testServerPort : port;
  return util.format('http://localhost:%d/%s', port, localPath);
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
  var command = generateCommand(conf);
//  console.log(command);
  exec(command, function(error, stdout, stderr) {
    if (error !== null) {
      throw new Error("Command: \n" + command + "\nError: " + error + "\nOutput: " + stdout + "\n");
    }
    var json = JSON.parse(stdout);
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

function testVisitStep(test){
  var testPageUrl = getFullUrl('site/visit.html');
  var conf = {
    "steps":[
      {
        "type":"visit",
        "url":testPageUrl
      }
    ]
  };
  executeCommand(conf, function(result){
      test.equals(result.finalUrl, testPageUrl);
      test.done();
  });
}

function testFormSubmitStep(test){
  var testPageUrl = getFullUrl('site/formSubmit.html');
  var testConfig = {
    "foo":"abc",
    "bar":"xyz"
  };

  var conf = {
    "steps":[
      {
        "type":"visit",
        "url":testPageUrl
      },
      {
        type:"formSubmit",
        "selector":"form",
        "fields": _.clone(testConfig)
      }
    ]
  };
  executeCommand(conf, function(result){
    var urlParts = url.parse(result.finalUrl, true);
    forEach(testConfig, function(val, key) {
      test.equals(urlParts.query[key], val);
    });
    test.done();
  });
}

function testExpressions(test){
  var testPageUrl = getFullUrl('site/expression.html');
  var testConfig = {
    "abc"  : "bar",
    "xyz"  : "foo"
  };
  var conf = {
    "jsExpressions": [],
    "steps":[
      {
        "type":"visit",
        "url":testPageUrl
      }
    ]
  };
  forEach(testConfig, function(val, key) {
    conf.jsExpressions.push(key);
  });
  executeCommand(conf, function(result){
    forEach(testConfig, function(val, key) {
      test.equals(result.jsExpressions[key], val);
    });
    test.done();
  });
}

function testRequests(test){
  var testPageUrl = getFullUrl('site/request.html');
  var testConfig = {
    //regex -> actual path
    "foo\\.png" : "/site/foo.png",
    "bar\\.js"  : "/site/bar.js",
    "bing\\.jpg"  : "/site/bing.jpg"
  };
  var conf = {
    "requests": [],
    "steps":[
      {
        "type":"visit",
        "url":testPageUrl
      }
    ]
  };
  forEach(testConfig, function(val, key) {
    conf.requests.push(key);
  });
  executeCommand(conf, function(result){
    forEach(testConfig, function(val, key) {
      test.equals(url.parse(result.requests[key]).path, val);
    });
    test.done();
  });
}

function generateLintReport(file) {
  var report = '';
  function appendToReport(data) {
    var nl  = "\n";
    report += data + nl;
  }
  appendToReport('Errors in file ' + file);

  var out = JSHINT.data(),
    errors = JSHINT.errors;

  errors.forEach(function(error){
    if (error) {
      // have to check this because, god knows why, but NULL is one of the elements of the errors array, and so there isn't really anything we can do about it.
      appendToReport(
        error.line + ':' + error.character + ' -> ' + error.reason + ' -> ' + error.evidence
      );
    }
  });

  // List globals
  appendToReport('');

  appendToReport('Globals: ');
  for(var j=0; j<out.globals.length; j++) {
    appendToReport('    ' + out.globals[j]);
  }
  return report;
}

function testCodeQuality(test) {
  fs.readFile(fatsoPath, function(err, data){
    if (err) {
      throw err;
    }
    if (!JSHINT(data.toString())){
      test.fail();
      console.log(generateLintReport(fatsoPath));
    }
    test.done();
  });
}

function testSetReferrerStep(test) {
  var referrerServerPort = testServerPort + 1;
  var referringServer = connect()
      .use(connect.static(testRootPath))
      .listen(referrerServerPort);
  var referrerUrl = getFullUrl('site/referrer.html', referrerServerPort);
  var targetUrl = getFullUrl('site/referrer.html');
  var conf = {
    "steps":[
      {
        "type":"setReferrer",
        "referrerURL":referrerUrl,
        "targetURL":targetUrl
      }
    ]
  };
  executeCommand(conf, function(result){
    test.ok(result.finalUrl.indexOf(testServerPort) !== -1, 'Unexpected final URL: ' + result.finalUrl);
    test.ok(result.referrerUrl.indexOf(referrerServerPort) !== -1, 'Unexpected referring URL: ' + result.referrerUrl);
    referringServer.close();
    test.done();
  });
}

function testClickStep(test) {
  var testPageUrl = getFullUrl('site/click.html');
  var conf = {
    "jsExpressions": ['foo'],
    "steps":[
      {
        "type":"visit",
        "url":testPageUrl
      },
      {
        "type":"click",
        "selector":'#clickMe'
      }
    ]
  };
  executeCommand(conf, function(result){
    test.equals(result.jsExpressions['foo'], 'now clicked');
    test.done();
  });
}

function testEvaluateStep(test) {
  var testPageUrl = getFullUrl('site/expression.html');
  var conf = {
    "jsExpressions": ['lmn'],
    "steps":[
      {
        "type":"visit",
        "url":testPageUrl
      },
      {
        "type":"evaluate",
        "expression":'window.lmn = xyz + abc;'
      }
    ]
  };
  executeCommand(conf, function(result){
    test.equals(result.jsExpressions['lmn'], 'foobar');
    test.done();
  });
}

module.exports = {
  setUp                      : setUp,
  tearDown                   : tearDown,
  testNoConfigThrowException : testNoConfigThrowException,
  testClickStep              : testClickStep,
  testEvaluateStep           : testEvaluateStep,
  testVisitStep              : testVisitStep,
  testFormSubmitStep         : testFormSubmitStep,
  testSetReferrerStep        : testSetReferrerStep,
  testExpressions            : testExpressions,
  testRequests               : testRequests,
  testCodeQuality            : testCodeQuality
};
