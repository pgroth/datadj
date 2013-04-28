
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var connect = require('connect');
var socketio = require('socket.io');
var midi = require('midi.io');

var twitter = require('ntwitter');

var uuid = require('node-uuid');
var OT = require('open-thumbnailer'),
    thumbnailer = new OT.Thumbnailer();

var credentials = require('./credentials.js');

var twit = new twitter({
    consumer_key: credentials.consumer_key,
    consumer_secret: credentials.consumer_secret,
    access_token_key: credentials.access_token_key,
    access_token_secret: credentials.access_token_secret
});



var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(app.router);
app.use('/public', express.static(__dirname + '/public/'));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/views/index.html');
});
app.get('/users', user.list);


var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = socketio.listen(server);
app.use(midi(io));

function startStream(keywords)
{
    var input = {};
    input['track'] = keywords;
    twit.stream('statuses/filter', input , function(stream) {
        stream.on('data', function (data) {
                //console.log(data);
                //var updated = createWebPageThumbs(data);
                
                for (var i = 0, len = keywords.length; i < len; i++)  {
                    if (data.text.indexOf(keywords[i]) != -1) {
                        console.log("found " + keywords[i]);
                    }
                }
               // var tosend = {};
                //tosend[string] = data;
                //io.sockets.emit('tweet', tosend);
        });
        
    });
}

var keywords = ["baseball", "football"];
startStream(keywords);



function createWebPageThumbs(result) {
        var urls = result['entities']['urls'];
        if (urls.length >= 1) {
                    console.log(urls[0]['expanded_url'])
                    var url = urls[0]['expanded_url']
                    var fname = uuid.v1();
                    thumbnailer.fromUrl(url,  __dirname + '/public/thumbs/' + fname + '.png', 
                        {viewport: { width: 1024, height: 768 }},function(error, thumbnail) {
                        if (error) {
                            console.dir(error);
                        }
                    });
                }
                result.thumb_url = '/public/thumbs/' + fname + '.png';
                return result;
}

app.get('/load', function(req, res) {
        var qstr = req.query.search;
        console.log('load... ' + req.query.search);
        twit.search(qstr, {'include_entities':'true','result_type':'recent','count':'40'}, function(err, response) {
            
            var results = response.statuses;
            for (var i = results.length - 1; i > 0; i--) {
                //console.log(results[i].text);
                var updated = createWebPageThumbs(results[i]);
                var tosend = {};
                tosend[qstr] = updated;
                io.sockets.emit('tweet', tosend);
            }
        });
});




/*twit.stream('statuses/filter', {'track':'#chi2013'}, function(stream) {
  stream.on('data', function (data) {
    data.thumb_url = '/public/thumbs/undefined.png';
    io.sockets.emit('tweet', data);
  });
});*/


