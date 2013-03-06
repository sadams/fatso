/** 
 * fatso.js
 * @author Sam Adams <adams.sam@gmail.com>
 */

var
  config,
  tester,
  cli = require("casper").create().cli,
  casper = require("casper").create(),
  exampleJsonInput = {
    "jsExpressions": [
      "tmPageId",
      "TMAN._containers[0].tags.length"
    ],
    "requests": [
      "google\\\\-analytics"
    ],
    "steps":[
      {
        "type":"setReferrer",
        "referrerURL":"http://www.google.co.uk/",
        "targetURL":"http://eu.tagman.com/"
      },
      {
        "type":"visit",
        "url":"http://eu.tagman.com/"
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
    "finalUrl":"http://eu.tagman.com/",
    "jsExpressions":{
      "tmPageId":7,
      "TMAN._containers[0].tags.length":1
    },
    "requests":{
      "google\\-analytics":"http://www.google-analytics.com/ga.js"
    },
    "referrerUrl":"http://www.google.co.uk/"
  },
  usage = 'Valid options (json required): --json=\'{[valid json]}\', --verbose (casper verbose), --debug\n\
\n\
Example JSON ("requests" have to be regex compatible) (has to be without line breaks):\n\
'+JSON.stringify(exampleJsonInput)+'\n\
\n\
Example Results JSON Output:\n\
'+JSON.stringify(exampleJsonOutput)+'',
  debug = cli.has("debug") ? true : false,
  stepsScreenShots = false, // enable screen-shotting the steps as we go
  casperConfig = {
    verbose : cli.has("verbose")
  };

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
  var visitFirstUrl = false;
  var jsExpressions = [];
  var requests = [];
  var steps = [];

  var UNDEFINED = 'undefined';

  var jsExpressionResults = {};
  var requestResults = {};

  function isUndefinedOrEmpty(obj) {
    return typeof obj === UNDEFINED || obj == '' || obj === false;
  }

  function isDefinedAndNotEmpty(obj) {
    return typeof obj !== UNDEFINED && obj != '' && obj !== false;
  }

  function defaultValueTo(value, defaultVaule) {
    if (isUndefinedOrEmpty(defaultVaule)) {
      defaultVaule = false;
    }
    return isUndefinedOrEmpty(value) ? defaultVaule: value;
  }

  function initialise(config) {
    if (isUndefinedOrEmpty(config)) {
      throw "Config not correct";
    }

    if (isUndefinedOrEmpty(config.steps)) {
      throw new Error('At least one step must exist');
    }

    steps = defaultValueTo(config.steps, []);
    jsExpressions = defaultValueTo(config.jsExpressions, []);
    requests = defaultValueTo(config.requests, []);

    requests.forEach(function(value){
      requestResults[value] = false;
    });

    jsExpressions.forEach(function(value){
      jsExpressionResults[value] = false;
    });
  }

  function indexesWithFalseValuesToArray(object) {
    var results = [];
    object.foreach(function(value, index) {
      if (value === false) {
        results.push(index);
      }
    });
    return results;
  }

  function getRequestsToBeMade() {
    return indexesWithFalseValuesToArray(requestResults);
  }

  function getUndefinedExpressions() {
    return indexesWithFalseValuesToArray(jsExpressionResults);
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

  function setupInitialRequest() {
    //if we have a referrer we have to open that page first -> will then click to targetUrl to set referrer ( see page.onLoadFinished() )
    if (referrerUrl) {


    } else if (visitFirstUrl) {
      if (debug) {
        casper.echo('visting initial page: ' + visitFirstUrl);
      }
      casper.open(visitFirstUrl).then(function(){
        if (debug) {
          this.echo('initial page loaded: ' + this.getCurrentUrl());
        }
        this.open(targetUrl);
      });
    } else {
      casper.open(targetUrl);
    }

    casper.then(function(){
      if (debug) {
        this.echo('target page reached: ' + this.getCurrentUrl());
      }
    });
  }

  function executeExpression(expression) {
    casper.then(function(expression){
      return function(){
        if(debug) {
          casper.echo("Evaluating: " + expression);
        }
//              this.evaluate(function() {
//                alert('foo');
//              });
        this.thenEvaluate(function() {
          eval(expression);
        });
        if(debug) {
          casper.echo("Evaluated: " + expression);
        }
      }
    }(expression));
  }

  function setReferrer(referrer, targetUrl) {
    var linkId = 'myTargetUrl_' + new Date().getTime();
    if (debug) {
      casper.echo('Visiting referring page: ' + referrerUrl);
    }
    casper.open(referrer);
    casper.then(function() {
      if (debug) {
        this.echo('referring page loaded: ' + this.getCurrentUrl());
      }
      // Inject and Click a Link to our target
      var ret = this.evaluate(function (target) {
        // Create and append the link
        var link = document.createElement('a');
        link.setAttribute('href', target);
        link.setAttribute('id', linkId)
        document.body.appendChild(link);
      }, {
        target:targetUrl
      });
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
        if(debug) {
          casper.echo("Now on page: " + formsub.url);
        }
      }
    }(options));
  }

  function click(selector) {
    casper.then(function(selector) {
      return function(){
        this.waitForSelector(selector, function(){
          if(debug) {
            casper.echo("Clicking element with selector: '" + selector + "'");
          }
          this.click(selector);
        });
      }
    }(selector));
  }

  function visit(url) {
    casper.then(function(url) {
      return function(){
        this.thenOpen(url, function() {
          if(debug) {
            casper.echo("Now on page: " + url);
          }
        });
      }
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
          click(step.selector)
          break;
        case STEP_VISIT:
          visit(url);
          break;
      }

      casper.then(function(local_i, localStepType){
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
            casper.capture(local_i+'-'+localStepType+'.png');
          }
          if (debug) {
            casper.echo('Current URL: ' + this.getCurrentUrl());
            casper.echo('step ' + local_i + ' complete.');
          }
        }
      }(i, step.type));

    });
  }

  function setupResourceListeners() {
    casper.waitForResource(function check(request) {
      for(var pattern in requestResults) {
        if (requestResults[pattern] !== false) {
          continue;
        }
        var regex = new RegExp(pattern);
        if (regex.test(request.url)) {
          requestResults[pattern] = request.url;
          continue;
        }
      }
      if (getRequestsToBeMade().length > 0) {
        return false;
      }
      return true;
    }, function then(){
      if (debug) {
        casper.echo('resource successfully waited for');
      }
    }, function timeout(){
      if (debug) {
        casper.echo('resources timed out');
      }
    });
  }

  function setupExpressionResolver() {
    casper.waitFor(function check() {
      for(var expression in jsExpressionResults) {
        if (jsExpressionResults[expression] !== false) {
          continue;
        }

        var value = this.evaluate(function (expression) {
          return eval(expression);
        }, {
          expression : expression
        });

        if (typeof value !== 'undefined') {
          jsExpressionResults[expression] = value;
          continue;
        }
      }
      if (getUndefinedExpressions().length < 1) {
        return true;
      }
      return false;
    }, function then(){
      if (debug) {
        casper.echo('expressions successfully resolved');
      }
    }, function timeout(){
      if (debug) {
        casper.echo('waiting for expressions timed out');
      }
    });
  }

  function test() {
    casper.start();
    setupInitialRequest();
    setupSteps();
    setupResourceListeners();
    setupExpressionResolver();

    casper.then(function(){
      if (debug) {
        this.echo('finishing');
      }
      var foundReferrer = this.evaluate(function (expression) {
        return eval(expression);
      }, {
        expression : 'window.document.referrer'
      });
      finish(foundReferrer, this.getCurrentUrl());
    });
    
    casper.run();
  }
  initialise(config);

  return {
    test:test
  }
})(config, debug, stepsScreenShots);

try {
  tester.test();
} catch (e) {
  throw e;
  casper.exit(1);
}
