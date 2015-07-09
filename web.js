var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var http = require('http');
var https = require('https');
var livereload = require('livereload');
var logfmt = require('logfmt');
var pkg = require('./package.json');
var request = require('request');

var inProduction = process.env.NODE_ENV === 'production';

var PROJECT_ROOT = __dirname;
var SERVER_ROOT = PROJECT_ROOT;

// 
// KINVEY KEYS
// 
var KINVEY_STAGING_APP_KEY = process.env.TSC_KINVEY_STAGING_APP_KEY;
var KINVEY_STAGING_APP_SECRET = process.env.TSC_KINVEY_STAGING_APP_SECRET;
var KINVEY_STAGING_MASTER_SECRET = process.env.TSC_KINVEY_STAGING_MASTER_SECRET;

var KINVEY_PRODUCTION_APP_KEY = process.env.TSC_PRODUCTION_KINVEY_APP_KEY;
var KINVEY_PRODUCTION_APP_SECRET = process.env.TSC_PRODUCTION_KINVEY_APP_SECRET;
var KINVEY_PRODUCTION_MASTER_SECRET = process.env.TSC_PRODUCTION_KINVEY_MASTER_SECRET;

var KINVEY_APP_KEY = inProduction ? KINVEY_PRODUCTION_APP_KEY : KINVEY_STAGING_APP_KEY;
var KINVEY_APP_SECRET = inProduction ? KINVEY_PRODUCTION_APP_SECRET : KINVEY_STAGING_APP_SECRET;
var KINVEY_MASTER_SECRET = inProduction ? KINVEY_PRODUCTION_MASTER_SECRET : KINVEY_STAGING_MASTER_SECRET;

if (!KINVEY_APP_KEY)            throw 'See README. KINVEY_APP_KEY not set.';
if (!KINVEY_APP_SECRET)         throw 'See README. KINVEY_APP_SECRET not set.';
if (!KINVEY_MASTER_SECRET)      throw 'See README. KINVEY_MASTER_SECRET not set.';

// 
// STRIPE KEYS
// 
var STRIPE_TEST_SECRET = process.env.TSC_STRIPE_TEST_SECRET_KEY;
var STRIPE_TEST_PUBLISHABLE_KEY = process.env.TSC_STRIPE_TEST_PUBLISHABLE_KEY;
var STRIPE_LIVE_SECRET = process.env.TSC_STRIPE_LIVE_SECRET_KEY;
var STRIPE_LIVE_PUBLISHABLE_KEY = process.env.TSC_STRIPE_LIVE_PUBLISHABLE_KEY;

var STRIPE_SECRET = inProduction ? STRIPE_LIVE_SECRET : STRIPE_TEST_SECRET;
var STRIPE_PUBLISHABLE_KEY = inProduction ? STRIPE_LIVE_PUBLISHABLE_KEY : STRIPE_TEST_PUBLISHABLE_KEY;

if (!STRIPE_SECRET)             throw 'See README. STRIPE_SECRET not set.';
if (!STRIPE_PUBLISHABLE_KEY)    throw 'See README. STRIPE_PUBLISHABLE_KEY not set.';

////

var app = express();

var PORT = process.env.PORT || 8000;

var sslOptions = {
  cert: fs.readFileSync('fixtures/dev-cert.pem'),
  key: fs.readFileSync('fixtures/dev-key.pem'),
};

// Livereload
var lrOptions = {
  exts: [
    'html',
    'css',
    'js',
    'png',
    'gif',
    'jpg',
    'jpeg',
  ],
  exclusions: [
    '.git/',
    '.idea/',
    'bower_components/',
    'node_modules/',
  ],
  applyJSLive: false,
  applyCSSLive: true,
  https: sslOptions
};

function keepAlive() {
  setInterval(function() {
    request.get("https://three-strand-code.herokuapp.com/");
  }, 300000);
}


/////////////////////////////////////////////////////////////
// SERVER

if (inProduction) {
  http.createServer(app).listen(PORT);
  keepAlive();
} else {
  https.createServer(sslOptions, app).listen(PORT, function() {
    console.log('Server listening at https://localhost:' + PORT);
    livereload.createServer(lrOptions).watch(SERVER_ROOT);
  });
}


/////////////////////////////////////////////////////////////
// Routing


//
// Logger
app.use(logfmt.requestLogger());


//
// Parse Req Body
app.use(bodyParser.json());


//
// Serve Static
app.use('/', express.static(__dirname + '/'));


//
// Payments
app.use('/charge', function(req, res) {
  var stripe = require("stripe")(STRIPE_SECRET);
  var stripeToken = req.body.stripeToken;
  //res.send(req.body);
  var charge = stripe.charges.create({
    amount: req.body.amount,
    currency: "usd",
    source: stripeToken,
    description: req.body.description
  }, function(err, charge) {
    var errMsg;

    if (err) {
      switch (err.type) {
        case 'StripeCardError':
          errMsg = err;
          break;

        case 'StripeInvalidRequest':
          errMsg = 'Please try again or contact hello@3strandcode.';
          break;

        default:
          errMsg = 'Please try again or contact hello@3strandcode.'
      }

      res.status(400).send(errMsg)
    } else {
      res.status(200).send(charge);
    }

  });
});


//
// Custom kinvey endpoints
app.use('/kinvey/:endpoint/', function(req, res) {
  var url = 'https://baas.kinvey.com/rpc/' + encodeURIComponent(KINVEY_APP_KEY) + '/custom/' + req.params.endpoint;
  var headers = {
    'Authorization': 'Basic ' + new Buffer(KINVEY_APP_KEY + ':' + KINVEY_MASTER_SECRET).toString('base64'),
    'Content-Type': 'application/json'
  };
  var form = req.body || {};

  request.post({url: url, headers: headers, form: form}, function(error, response, body) {

    if (error) {
      res.status(400).send(error)
    } else {
      res.status(response.statusCode).send(body);
    }
  });
});


//
// Angular html5mode
app.all('/*', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});
