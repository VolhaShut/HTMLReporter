var fs = require('fs');
var path = require('canonical-path');
var _ = require('lodash');


// Custom reporter
var Reporter = function(options) {
  var _defaultOutputFile = path.resolve(process.cwd(), './_test-output', 'protractor-results.html');
  options.outputFile = options.outputFile || _defaultOutputFile;
  var tempHTMLFile='./node_modules/html-reporter/template.html';
  var totalSpecs=0;
  var failedSpecs=0;
  var passedSpecs=0;
  initOutputFile(options.outputFile);
  var screensDir= path.dirname(options.outputFile)+'/screens/_';
  
  options.appDir = options.appDir ||  './';
  var _root = { appDir: options.appDir, suites: [] };
  log('AppDir: ' + options.appDir, +1);
  var _currentSuite;

  this.suiteStarted = function(suite) {
    ensureDirectoryExistence(screensDir);
    _currentSuite = { description: suite.description, status: null, specs: [] };
    _root.suites.push(_currentSuite);
    log('Suite: ' + suite.description, +1);
  };

  this.suiteDone = function(suite) {
    var statuses = _currentSuite.specs.map(function(spec) {
      return spec.status;
    });
    statuses = _.uniq(statuses);
    var status = statuses.indexOf('failed') >= 0 ? 'failed' : statuses.join(' ');
    _currentSuite.status = status;
    log('Suite ' + _currentSuite.status + ': ' + suite.description, -1);
  };

  this.specStarted = function(spec) {
    totalSpecs++;
  };

  this.specDone = function(spec) {
    var nameScreen=screensDir+spec.description.replace(/\s+/g,"_")+'.png';
    var currentSpec = {
      description: spec.description,
      status: spec.status,
      img:nameScreen
    };

    browser.takeScreenshot().then((base64png) => {   
    let stream = fs.createWriteStream(nameScreen);
    stream.write(new Buffer(base64png, 'base64'));
    stream.end();
    });

    if (spec.failedExpectations.length > 0) {
      currentSpec.failedExpectations = spec.failedExpectations;
    }
    spec.status==='passed'?passedSpecs++:failedSpecs++;
    _currentSuite.specs.push(currentSpec);
    log(spec.status + ' - ' + spec.description);
  };

  this.jasmineDone = function() {
    outputFile = options.outputFile;
    var output = formatOutput(_root);
    fs.appendFileSync(outputFile, output);
  };

  function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (directoryExists(dirname)) {
      return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
  }

  function directoryExists(path) {
    try {
      return fs.statSync(path).isDirectory();
    }
    catch (err) {
      return false;
    }
  }

  function readTemplateHTML(tempFile){
     return fs.readFileSync(tempFile,'utf8');
  }

  function initOutputFile(outputFile) {
    ensureDirectoryExistence(outputFile,'/screens');
    var htmlTemplate=readTemplateHTML(tempHTMLFile);
    var header = "<div>Protractor results for: " + (new Date()).toLocaleString() + '</div>';
    fs.writeFileSync(outputFile, htmlTemplate+header,'utf8');

  }

  // for output file output
  function formatOutput(output) {
    var indent = '  ';
    var pad = '  ';
    var results = [];
    results.push('<p>AppDir:' + output.appDir+'</p>');
    results.push('<h3>Total tests:'+totalSpecs);
    results.push('<p>Passed tests:<div class="passed">'+passedSpecs+'</div></p>');
    results.push('<p>Failed tests:<div class="failed">'+failedSpecs+'</div></p>');

    output.suites.forEach(function(suite) {
      results.push('<p>'+pad + 'Suite: ' + suite.description + ' -- ' + suite.status+'</p><hr>');
      pad+=indent;
      suite.specs.forEach(function(spec) {
        results.push('<p>' + spec.description+'<div class="passed">'+spec.status + '</div> </p>');
        results.push('<img src='+spec.img+'  width="1360" height="768"/>');
        if (spec.failedExpectations) {
          pad+=indent;
          spec.failedExpectations.forEach(function (fe) {
            results.push('<p><div class="failed">message: ' + fe.message+'</div></p>');
          });
         
        }
      })
    });

    results.push('</div></body></html>');
    return results.join(' ');
  }

  // for console output
   var _pad;
  function log(str, indent) {
    _pad = _pad || '';
    if (indent == -1) {
      _pad = _pad.substr(2);
    }
    console.log(_pad + str);
    if (indent == 1) {
      _pad = _pad + '  ';
    }
  }
};

module.exports = Reporter;
