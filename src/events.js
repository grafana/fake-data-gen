var program = require('commander');
var graphite = require('graphite');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var pkg = require('./package.json');

var dataDir = './data/';

program
  .version(pkg.version)
	.option('--influxdb', 'Live feed data into to influxdb');

program.parse(process.argv);

if (program.influxdb) {
  live_influxdb();
}

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});

function live_influxdb() {
  var restify = require('restify');
  var client = restify.createJsonClient({ url: 'http://localhost:9086' });
  var data = {};

  client.get('/query?q=' + encodeURIComponent('CREATE DATABASE site'), function(err, res) {
    console.log("CREATE site DATABASE\n\t" + err);
  });

  client.get('/query?q=' + encodeURIComponent('CREATE RETENTION POLICY bar ON site DURATION 1h REPLICATION 1 DEFAULT'), function(err, res) {
    console.log("CREATE RETENTION POLICY\n\t" + err);
  });

  function padLeft(nr, n, str){
    return Array(n-String(nr).length+1).join(str||'0')+nr;
  }

  function randomEvent(name, tags, start, variation) {
    console.log('writing event');

    client.post('/write', {
      "database": "site",
      "points": [
        {
          "measurement": "events",
          "tags": { type: 'deploy', host: 'server-01' },
          "timestamp": new Date().getTime(),
          "precision": "ms",
          "fields": {
            "version": "v0.1.1",
            "text": "Deployment started",
          }
        }
      ]
    }, function(err, res) {
      if (err) {
        console.log("writing influxdb metric error: " + err);
      }
    });
  }

  setInterval(function() {
    randomEvent();
  }, 100000);

  randomEvent();
}

