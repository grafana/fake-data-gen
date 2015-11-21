var _ = require('underscore');
var moment = require('moment');

function liveFeedToLogstash() {
  console.log('Starting Elasticsearch Data Sender');

  var restify = require('restify');
  var client = restify.createJsonClient({ url: 'http://localhost:9300' });
  var data = {};

  // set template
  console.log('Updating metrics mapping template');

  client.put('/_template/metrics', {
    "template" : "metrics-*",
    "settings" : { "number_of_shards" : 1, "number_of_replicas": 0 },
    "mappings" : {
      "metric" : {
        "_all" : {"enabled" : false},
        "_source" : {"enabled" : false },
        "_type" : {"index" : "no", "store": false},
        "_id" : {"index" : "no", "store" : false},
        "_index" : { "enabled" : false },

        "properties": {
          "@value": {type: 'float', },
          "@timestamp": {type: 'date', },
        },

        "dynamic_templates": [
          {
            "strings": {
              "match_mapping_type": "string",
              "mapping": {
                "type": "string",
                "index" : "not_analyzed",
                "omit_norms" : true,
              }
            }
          }
        ]
      }
    }
  }, function(err) {
    console.log('template mapping res:', err);
  });


  function randomWalk(name, tags, start, variation) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);
    var message = {
      "@metric": name,
      "@timestamp": new Date(),
      "@value": data[name],
    };

    _.each(tags, function(value, key) {
      message['@' + key] = value;
    });

    client.post('/metrics-' + moment().format('YYYY.MM.DD') + '/metric', message, function(err) {
      if (err) {
        console.log('Metric write error', err);
      }
    });
  }

  function writeLogEntry() {
    var message = {
      "@message": 'Deployed website',
      "@timestamp": new Date(),
      "tags": ['deploy', 'website-01'],
      "description": "Torkel deployed website",
      "long": "asdsaa asdas dasdas dasdasdas asdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa asdasdasdasdasdasdas asd",
    };

    console.log('Writing elastic log entry');
    client.post('/logs-' + moment().format('YYYY.MM.DD') + '/log', message, function(err) {
      if (err) {
        console.log('Log write error', err);
      }
    });

    setTimeout(writeLogEntry, Math.random() * 900000);
  }

  setInterval(function() {
    randomWalk('logins.count', { source: 'backend', hostname: 'server1' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server2' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server3' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server4' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server-5' }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server1' }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server 20' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server1' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2);
  }, 10000);

  writeLogEntry();
  setTimeout(writeLogEntry, Math.random() * 900000);
}

module.exports = {
  live: liveFeedToLogstash
};
