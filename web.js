var express = require('express');
var livereload = require('express-livereload');
var logfmt = require('logfmt');
var pkg = require('./package.json');
var request = require('request');

var SERVER_ROOT = __dirname;

var kinveyAppKey = process.env.TSC_KINVEY_APP_KEY;
var kinveyAppSecret = process.env.TSC_KINVEY_APP_SECRET;
var kinveyMasterSecret = process.env.TSC_KINVEY_MASTER_SECRET;

//////////////////////////////////////////////////////////////////
// SETUP APP
//

var app = express();

//
// Livereload
livereload(app, {
    // options: https://github.com/napcs/node-livereload#options
    watchDir: SERVER_ROOT
});

//////////////////////////////////////////////////////////////////
// SETUP SERVER

//

var port = Number(process.env.PORT || 8000);
var server = app.listen(port, function() {
    console.log('Listening on ' + port);
});

//
// logging
app.use(logfmt.requestLogger());


// static serve
app.use('/', express.static(__dirname + '/'));


// custom kinvey endpoints
app.use('/kinvey/:endpoint/', function(req, res) {
    var url = 'https://baas.kinvey.com/rpc/' + encodeURIComponent(kinveyAppKey) + '/custom/' + req.params.endpoint;
    var headers = {
        'Authorization': 'Basic ' + new Buffer(kinveyAppKey + ':' + kinveyMasterSecret).toString('base64'),
        'Content-Type': 'application/json'
    };
    
    var form = {};

    request.post({url: url, headers: headers, form: form}, function(error, response, body) {
        res.send(error || body);
    });
});

// let angular handle all routing requests (html5mode)
app.all('/*', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
