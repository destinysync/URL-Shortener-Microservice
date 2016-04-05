'use strict';

var express = require('express');
var routes = require('./app/routes/index.js');
var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');

var app = express();
require('dotenv').load();
require('./app/config/passport')(passport);

mongoose.connect(process.env.MONGO_URI);

app.use('/controllers', express.static(process.cwd() + '/app/controllers'));
app.use('/public', express.static(process.cwd() + '/public'));
app.use('/common', express.static(process.cwd() + '/app/common'));

app.use(session({
    secret: 'secretClementine',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

routes(app, passport);

var port = process.env.PORT || 8080;
var mongo = require('mongodb').MongoClient;
var originalURL = '';
var prefix = "https://url-shortener-service-destinysync.c9users.io/";
var urlPairs = {};
var resultJSON = {};

function getResultJSON(originalURL, shortenedURL) {
    var json = {
        original_url: originalURL,
        short_url: shortenedURL
    };
    resultJSON = json;
}

function dbInsert(callback) {
    var numberCount = 1000;
    mongo.connect('mongodb://localhost:27017/clementinejs', function(err, db) {
        var collection = db.collection('urlPairs');
        var docToInsert = {
            originalURL: originalURL,
            shortenedURL: ''
        };
        if (err) {
            throw new Error('Database failed to connect!');
        } else {
            console.log('MongoDB successfully connected on port 27017.');
            collection.find({
                _id: 'numCount'
            }).toArray(function(err, found) {
                if (err) {
                    throw new Error('Doc Not Found!');
                } else {
                    docToInsert = {
                        originalURL: originalURL,
                        shortenedURL: prefix + (found[0]['numCount'] + 1).toString()
                    };
                    numberCount = found[0]['numCount'] + 1;
                    getResultJSON(originalURL, prefix + numberCount.toString());
                    collection.insert(docToInsert);
                    collection.update({_id: 'numCount'}, {$set: {numCount: numberCount}});
                    callback();
                }
            });
        }
    });

}

function findOriginalURL(callback) {
    mongo.connect('mongodb://localhost:27017/clementinejs', function(err, db) {
        if (err) {
            throw new Error('Database failed to connect!');
        } else {
            console.log('MongoDB successfully connected on port 27017.');
            db.collection('urlPairs').find({
                shortenedURL: prefix + serial
            }).toArray(function(err, data) {
                console.log(data);
                if (err) {
                    throw new Error('Database failed to connect!');
                } else if (data[0] === undefined) {
                    originalURI = "";
                    callback();
                    db.close();
                } else if (data[0] !== undefined) {
                    originalURI = data[0]['originalURL'];
                    callback();
                    db.close();
                }
            });
        }
    });
}

function sendJSON(){
    var obj2 = obj;
    obj2.json(resultJSON);
}

var obj = {};
app.get('/url/*', function(req, res) {
    originalURL = req.params[0];
    obj = res;
    if (originalURL.match(/^http:\/\/www\..+\.com$/i) == null) {
    	res.json({
        original_url: originalURL,
        short_url: 'Please Provide A URL With The Same Format As http://www.example.com'
    })} else {
    	 dbInsert(sendJSON);
    }
});

var originalURI = '';
var serial = '';
var resObj = {};


function redirectOrNot() {
    if (originalURI != '') {
        resObj.redirect(originalURI);
    } else {
        resObj.end('No Record');
    }
}

app.get('/:serial', function(req, res) {
    resObj = res;
    serial = req.params.serial.toString();
    if (serial.match(/^\d+$/i) !== null) {
        findOriginalURL(redirectOrNot);
    } else {
        res.end('no match');
    }
});


app.listen(port, function() {
    console.log('Node.js listening on port ' + port + '...');
});