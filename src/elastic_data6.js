var _ = require('underscore');
var moment = require('moment');
var restify = require('restify');

var NEXT_ATTEMPT_TIMEOUT = 3000;
var ES_METRICS_TEMPLATE = {
  "template" : "metrics-*",
  "settings" : { "number_of_shards" : 1, "number_of_replicas": 0 },
  "mappings" : {
    "metric" : {
      "_source" : { "enabled" : false },
      "properties": {
        "@value":     { "type": 'float', },
        "@timestamp": { "type": 'date', "format": "epoch_millis" },
        "@location":  { "type": "geo_point"}
      },
      "dynamic_templates": [
        {
          "strings": {
            "match_mapping_type": "string",
            "mapping": {
              "type": "keyword"
            }
          }
        }
      ]
    }
  }
};

function liveFeedToLogstash(program) {
  console.log('Starting Elasticsearch Data Sender');

  var uri = "http://" + program.server + ":" + program.port;
  var client = restify.createJsonClient({ url: uri });
  var data = {
    derivative: 0,
  };

  console.log('Updating metrics mapping template');
  tryToConnect(createIndexCallback, NEXT_ATTEMPT_TIMEOUT);

  function tryToConnect(callback, timeout) {
    client.get('/', function(err, req, res, obj) {
      if (err) {
        console.log("Error connecting ES, waiting for " + NEXT_ATTEMPT_TIMEOUT/1000 + " sec\n", err);
        var connectAgain = _.partial(tryToConnect, callback, timeout);
        setTimeout(connectAgain, timeout);
      } else {
        console.log("Successfully connected to ES");
        callback();
      }
    });
  }

  function createIndexCallback() {
    createIndex(feedData);
  }

  function createIndex(feedDataCallback) {
    client.put('/_template/metrics', ES_METRICS_TEMPLATE, function(err, req, res, obj) {
      if (err) {
        console.log('template mapping error:', err);
      } else {
        console.log('template created');
        feedDataCallback();
      }
    });
  }

  function randomWalk(name, tags, start, variation, recoveryCallback) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);

    var message = {
      "@metric": name,
      "@timestamp": new Date().getTime(),
      "@value": data[name],
      "@tags": tags,
      "@location": generateRandomPoint({lat: Math.random() * 50, lon: Math.random() * 50}, 100)
    };

    _.each(tags, function(value, key) {
      message['@' + key] = value;
    });

    client.post('/metrics-' + moment().format('YYYY.MM.DD') + '/metric', message, function(err) {
      if (err) {
        console.log('Metric write error', err);
        recoveryCallback();
      } else {
        console.log('Metric "' + name + '" written successfully');
      }
    });
  }

  function generateRandomPoint(center, radius) {
    var x0 = center.lon;
    var y0 = center.lat;
    // Convert Radius from meters to degrees.
    var rd = radius/111300;

    var u = Math.random();
    var v = Math.random();

    var w = rd * Math.sqrt(u);
    var t = 2 * Math.PI * v;
    var x = w * Math.cos(t);
    var y = w * Math.sin(t);

    var xp = x/Math.cos(y0);

    // Resulting point.
    return (y+y0) + ', ' + (xp+x0);
  }

  function derivativeTest(recoveryCallback) {
    data.derivative += 100;

    var message = {
      "@metric": 'derivative',
      "@timestamp": new Date().getTime(),
      "@value": data.derivative,
    };

    client.post('/metrics-' + moment().format('YYYY.MM.DD') + '/metric', message, function(err) {
      if (err) {
        console.log('Metric write error', err);
        recoveryCallback();
      } else {
        console.log('Metric "derivative" written successfully');
      }
    });
  }

  function writeLogEntry(recoveryCallback) {
    var message = {
      "@message": 'Deployed website',
      "@timestamp": new Date().getTime(),
      "tags": ['deploy', 'website-01'],
      "description": "Torkel deployed website",
      "coordinates": {'latitude':  12, 'longitude': 121, level: {depth: 3, coolnes: 'very'}},
      "long": "asdsaa asdas dasdas dasdasdas asdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa asdasdasdasdasdasdas asd",
      "unescaped-content": "breaking <br /> the <br /> row",
    };

    console.log('Writing elastic log entry');
    client.post('/logs-' + moment().format('YYYY.MM.DD') + '/log', message, function(err) {
      if (err) {
        console.log('Log write error', err);
        recoveryCallback();
      }
    });
  }

  function feedData() {
    console.log('Starting data feeding');

    var randomWalkID = setInterval(function() {
      randomWalk('logins.count', { source: 'backend', hostname: 'server1' }, 100, 2, recoveryCallback);
      randomWalk('logins.count', { source: 'backend', hostname: 'server2' }, 100, 2, recoveryCallback);
      randomWalk('logins.count', { source: 'backend', hostname: 'server3' }, 100, 2, recoveryCallback);
      randomWalk('logins.count', { source: 'backend', hostname: 'server/4' }, 100, 2, recoveryCallback);
      randomWalk('logins.count', { source: 'backend', hostname: 'server-5' }, 100, 2, recoveryCallback);
      randomWalk('logins.count', { source: 'site', hostname: 'server1' }, 100, 2, recoveryCallback);
      randomWalk('logins.count', { source: 'site', hostname: 'server 20' }, 100, 2, recoveryCallback);
      randomWalk('logins.count', { source: 'site', hostname: 'server"21' }, 100, 2, recoveryCallback);
      randomWalk('cpu', { source: 'site', hostname: 'server1' }, 100, 2, recoveryCallback);
      randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2, recoveryCallback);
      randomWalk('erratic', { source: 'site', hostname: 'server2' }, 100, 20, recoveryCallback);
      derivativeTest(recoveryCallback);
    }, 10000);

    var writeLogEntryID = setInterval(function() {
      writeLogEntry(recoveryCallback);
    }, Math.random() * 50000);

    var recoveryCallback = _.once(recoveryAction);
    function recoveryAction() {
      console.log('Running recovery action');
      // Stop feeding data
      clearInterval(randomWalkID);
      clearInterval(writeLogEntryID);
      tryToConnect(createIndexCallback, NEXT_ATTEMPT_TIMEOUT);
    }
  }
}

module.exports = {
  live: liveFeedToLogstash
};
