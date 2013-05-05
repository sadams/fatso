/** 
 * fatso.js
 * @author Sam Adams <adams.sam@gmail.com>
 */
/*jshint multistr: true */
var
  config,
  tester,
  cli = require("casper").create().cli,
  casper,
  exampleJsonInput = {
    "jsExpressions": [
      "my.object.variableEquals",
      "someOtherFunctionReturns()"
    ],
    "requests": [
      "google\\\\-analytics"
    ],
    "steps":[
      {
        "type":"setReferrer",
        "referrerURL":"http://www.google.co.uk/",
        "targetURL":"http://foo.bar.com/"
      },
      {
        "type":"visit",
        "url":"http://foo.bar.com/"
      },
      {
        "type":"click",
        "selector":"#updateOrderLineForm input.continueinputbtn"
      },
      {
        "type":"formSubmit",
        "selector":"#fsKeywordContainer form",
        "fields":{
          "Keyword":"SE1 3LS"
        }
      },
      {
        "type":"click",
        "selector":"table tr td.storeAction a.proceedBtn"
      },{
        "type":"formSubmit",
        "selector":"#checkout form",
        "fields":{
          "FirstName":"Test",
          "LastName":"Test",
          "EmailAddress":"test@example.com",
          "PhoneNumber":"07596002233",
          "ConfirmedTnCs":true
        }
      }
    ]
  },
  exampleJsonOutput = {
    "finalUrl":"http://foo.bar.com/",
    "jsExpressions":{
      "my.object.variableEquals":7,
      "someOtherFunctionReturns()":1
    },
    "requests":{
      "google\\-analytics":"http://www.google-analytics.com/ga.js"
    },
    "referrerUrl":"http://www.google.co.uk/"
  },

  usage = 'Valid options (json required): --json=\'{[valid json]}\', --verbose (casper verbose), --log-to-console=true\n\n' +
    'Example JSON ("requests" have to be regex compatible) (has to be without line breaks):\n' +
    JSON.stringify(exampleJsonInput) +
    '\n\n' +
    'Example Results JSON Output:\n' +
    JSON.stringify(exampleJsonOutput),
  debug = cli.has("log-to-console") ? true : false,
  stepsScreenShots = false, // enable screen-shotting the steps as we go
  casperConfig = {
    verbose : cli.has("verbose")
  };

function forEach(obj, fn){
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      var val = obj[prop];
      fn.call(val, val, prop);
    }
  }
}

casper = require("casper").create(casperConfig);

// Reads the JSON from the command line and try running our tests
try {
  if (!casper.cli.has("json")) {
    throw new Error('json config not passed');
  }

  try {
    config = JSON.parse(casper.cli.get("json")); //json
  } catch (e) {
    throw new Error("Invalid JSON (" + e.message + "): " + casper.cli.get("json"));
  }
} catch (e) {
  throw new Error(e.message + " \n " + usage);
}


// The test suit
tester = (function(config, debug, stepsScreenShots) {
  var STEP_FORM_SUBMIT = 'formSubmit';
  var STEP_SET_REFERRER = 'setReferrer';
  var STEP_CLICK = 'click';
  var STEP_VISIT = 'visit';
  var STEP_EVALUATE = 'evaluate';

  var referrerUrl = false;
  var jsExpressions = [];
  var requests = [];
  var steps = [];

  var UNDEFINED = 'undefined';

  var jsExpressionResults = {};
  var requestResults = {};

  function echo(message) {
    if (debug) {
      casper.echo(message);
    }
  }

  function isUndefined(test) {
    return typeof test === UNDEFINED;
  }

  function isNull(test) {
    return test === null;
  }

  function isEmpty(obj) {
    return isUndefined(obj) || function (obj) {
      return !((typeof obj === 'object') ? Object.keys(obj).length : obj);
    }(obj);
  }

  function defaultValueTo(value, defaultValue) {
    if (isUndefined(defaultValue)) {
      defaultValue = false;
    }
    return isEmpty(value) ? defaultValue: value;
  }

  function initialise(config) {
    if (isEmpty(config)) {
      throw new Error("Config not correct");
    }

    if (isUndefined(config.steps)) {
      throw new Error('At least one step must exist');
    }

    steps = defaultValueTo(config.steps, []);
    jsExpressions = defaultValueTo(config.jsExpressions, []);

    requests = defaultValueTo(config.requests, []);

    requests.forEach(function(value){
      requestResults[value] = null;
    });

    jsExpressions.forEach(function(value){
      jsExpressionResults[value] = null;
    });
  }

  /**
   * We use NULL as the not-set-value because, when we output the results,
   *  if they don't resolve, 'undefined' values would not be output.
   * @param {Object} obj
   * @returns {Array}
   */
  function indexesWithNullValuesToArray(obj) {
    var results = [];
    if (!isEmpty(obj)) {
      forEach(obj, function(value, index) {
        if (isNull(value)) {
          results.push(index);
        }
      });
    }
    return results;
  }

  function getRequestsToBeMade() {
    return indexesWithNullValuesToArray(requestResults);
  }

  function getUndefinedExpressions() {
    return indexesWithNullValuesToArray(jsExpressionResults);
  }

  function finish(finalReferrer, finalUrl) {
    var code = 0;

    var returnObj = {
      finalUrl : finalUrl,
      jsExpressions : jsExpressionResults,
      requests : requestResults,
      referrerUrl : finalReferrer
    };

    try {
      if (referrerUrl && finalReferrer != referrerUrl) {
        throw new Error('expected referrer ' + referrerUrl + ' doesn\'t match referrer found: ' + finalReferrer);
      }
    } catch (e) {
      returnObj.error = e.message;
      code = 1;
    }

    casper.echo(JSON.stringify(returnObj));
    casper.exit(code);
  }

  function executeExpression(expression) {
    casper.then(function() {
      echo("Evaluating: " + expression);
      var returnValue = this.evaluate(function (expression) {
        /*jshint evil: true */
        var fatsoReturnValue = eval(expression);
        /*jshint evil: false */
        return fatsoReturnValue;
      }, {
        expression:expression
      });
      echo("Return value of evaluation: " + returnValue);
      echo("Evaluated: " + expression);
    });
  }

  function setReferrer(referrer, targetUrl) {
    var linkId = 'myTargetUrl_' + new Date().getTime();
    echo('Visiting referring page: ' + referrer);
    casper.open(referrer);
    casper.then(function() {
      echo('Referring page loaded: ' + this.getCurrentUrl());
      // Inject and Click a Link to our target
      var linkLoaded = this.evaluate(function (target, linkId) {
        // Create and append the link
        var link = document.createElement('a');
        link.setAttribute('href', target);
        link.setAttribute('id', linkId);
        document.body.appendChild(link);
        return document.getElementById(linkId) ? true : false;
      }, {
        target:targetUrl,
        linkId:linkId
      });
      echo('Link correctly generated: ' + (linkLoaded ? 'true' : 'false'));
    });
    casper.then(function(){
      this.click('a#' + linkId);
    });
  }

  function submitForm(options) {
    casper.then(function(formsub){
      return function(){
        //TODO: put the waitForSelector thing in as with click below
        this.fill(formsub.selector, formsub.fields, true);
        echo("Now on page: " + formsub.url);
      };
    }(options));
  }

  function click(selector) {
    casper.then(function(selector) {
      return function(){
        this.waitForSelector(selector, function(){
          echo("Clicking element with selector: '" + selector + "'");
          this.click(selector);
        });
      };
    }(selector));
  }

  function visit(url) {
    echo('Attempting to visit: ' + url);
    casper.then(function(url) {
      return function(){
        casper.open(url);
      };
    }(url));
  }

  function setupSteps() {
    steps.forEach(function(step, i) {
      /*
       * closures are used in this loop to avoid scoping issues with
       * variables (see comments bellow)
       */
      switch(step.type) {
        case STEP_SET_REFERRER:
          setReferrer(step.referrerURL, step.targetURL);
          break;
        case STEP_EVALUATE:
          executeExpression(step.expression);
          break;
        case STEP_FORM_SUBMIT:
          submitForm(step);
          break;
        case STEP_CLICK:
          click(step.selector);
          break;
        case STEP_VISIT:
          visit(step.url);
          break;
      }

      casper.then(function(index, localStepType){
        /*
         * we are returning a closure to change the scope of the passed
         * variables so they don't change in every iteration.
         * we do this because the closures are called by casper after
         * the loop has finished but they are still called synchronously
         * and in order.
         *
         * i.e., here (i, step.type) will run function(local_i, localStepType)
         * that will return the closure which casper will call when its
         * ready. function() { ....}
         */
        return function() {
          if (stepsScreenShots) {
            casper.capture(index + '-' + localStepType + '.png');
          }
            echo('Current URL: ' + this.getCurrentUrl());
            echo('step ' + index + ' complete.');
        };
      }(i, step.type));

    });
  }

  /**
   * Using casper.waitForResource, we make casper call the passed function with a request object.
   * Only when all the requests we are waiting for have passed through this function does it return true, which allows
   *  it to stop waiting.
   */
  function setupResourceListeners() {
    casper.waitForResource(function check(request) {
      for(var pattern in requestResults) {
        if (requestResults.hasOwnProperty(pattern)) {
          if (!isNull(requestResults[pattern])) {
            continue;
          }
          var regex = new RegExp(pattern);
          if (regex.test(request.url)) {
            requestResults[pattern] = request.url;
            continue;
          }
        }
      }

      if (getRequestsToBeMade().length > 0) {
        return false;
      }
      return true;
    }, function then(){
      echo('resource successfully waited for');
    }, function timeout(){
      echo('resources timed out');
    });
  }

  function setupExpressionResolver() {
    casper.waitFor(function check() {
      /*jshint evil:true */
      function evaluate(expression) {
        return eval(expression);
      }
      /*jshint evil:false */
      for(var expression in jsExpressionResults) {
        if (jsExpressionResults.hasOwnProperty(expression)) {

          if (!isNull(jsExpressionResults[expression])) {
            continue;
          }
          //echo('Evaluating expression: ' + expression);
          var value = this.evaluate(evaluate, {
            expression : expression
          });

          if (!isUndefined(value)) {
            jsExpressionResults[expression] = value;
            continue;
          }
        }
      }
      if (getUndefinedExpressions().length < 1) {
        return true;
      }
      return false;
    }, function then(){
      echo('expressions successfully resolved');
    }, function timeout(){
      echo('waiting for expressions timed out');
    });
  }

  function test() {
    casper.start();
    setupSteps();
    setupResourceListeners();
    setupExpressionResolver();

    casper.then(function(){
      echo('finishing');
      /*jshint evil:true */
      var foundReferrer = this.evaluate(function (expression) {
        return eval(expression);
      }, {
        expression : 'window.document.referrer'
      });
      /*jshint evil:false */

      finish(foundReferrer, this.getCurrentUrl());
    });
    casper.run();
  }
  initialise(config);

  return {
    test:test
  };
})(config, debug, stepsScreenShots);

try {
  tester.test();
} catch (e) {
//  throw e;
  casper.exit(1);
}
