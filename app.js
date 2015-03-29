var program = require('commander');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var graphite = require('graphite');
var pkg = require('./package.json');

var dataDir = './data/';

program
  .version(pkg.version)
  .option('-g, --graphite <graphite>', 'Graphite address')
	.option('-i, --import', 'Run import for x days')
	.option('-l, --live', 'Live feed data')
	.option('-o, --opentsdb', 'Live feed data in to opentsdb')
	.option('--influxdb', 'Live feed data into to influxdb')
	.option('--kairosdb', 'Live feed data into to kairosdb')
	.option('-d, --days <days>', 'Days');

program.parse(process.argv);

var graphiteUrl = 'plaintext://' + program.graphite;

if (program['import']) {
	import_data();
}

if (program.live) {
	live_data();
}

if (program.opentsdb) {
  live_opentsdb();
}

if (program.influxdb) {
  live_influxdb();
}

if (program.kairosdb) {
  live_kairosdb();
}

function get_resolution(retention, date) {
	var now = new Date();
	var hours = Math.abs(now - date) / 3600000;

	if (hours <= 24) {
		return retention[0];
	}
	if (hours <= 168) {
		return retention[1];
	}
	return retention[2];
}

function import_data() {
	if (!program.days) {
		console.log('need to specify number of days');
		program.help();
	}

	var client = graphite.createClient(graphiteUrl);

	loop_data_files(import_metric_data);

	function import_metric_data(meta, series) {
		var now = new Date();

		var key = _.template(meta.pattern, { target: series.target });
		var index = find_current_index(series.datapoints);
		var currentDate = new Date();
		var secondsPerPoint = 10;
		var loops = 0;
		var direction = -1;
		var pointCount = series.datapoints.length;
		var metric = {};

		while(true) {
			if (index === -1 || index === pointCount) {
				direction = direction * -1;
				index = index + direction;
				loops++;
			}

			if (loops >= program.days) {
				return;
			}

			secondsPerPoint = get_resolution(meta.retention, currentDate);

			// ignore null values
			if (series.datapoints[index][0] === null) {
				index = index + direction;
				currentDate.setSeconds(currentDate.getSeconds() - secondsPerPoint);
				continue;
			}

			if (secondsPerPoint < meta.secondsPerPoint) {
				var factor = meta.secondsPerPoint / secondsPerPoint;
				for (var i = 0; i < factor; i++)	{
					var point = series.datapoints[index];
					var value = point[0] / factor;
					metric[key] = value;
					client.write(metric, currentDate);
					currentDate.setSeconds(currentDate.getSeconds() - secondsPerPoint);
				}

				index = index + direction;
			}
			else if (secondsPerPoint === meta.secondsPerPoint) {
				var point = series.datapoints[index];
				metric[key] = point[0];
				client.write(metric, currentDate);
				currentDate.setSeconds(currentDate.getSeconds() - secondsPerPoint);
				index = index + direction;
			}
			else {
				// need to aggregate points
				var factor = secondsPerPoint / meta.secondsPerPoint;
				var value = null;
				for (var i = 0; i < factor; i++)	{
					var point = series.datapoints[index];
					if (point[0] !== null) {
						value = (value || 0) + point[0];
					}

					index = index + direction;

					if (index === -1 || index === pointCount) {
						direction = direction * -1;
						index = index + direction;
						loops++;
					}
				}

				if (value !== null) {
					if (meta.aggregation === 'avg') {
						value = value / factor;
					}

					metric[key] = value;
					client.write(metric, currentDate, function(err) {
					  if (err) {
					    console.log('error' + err)
					  }
					});
					currentDate.setSeconds(currentDate.getSeconds() - secondsPerPoint);
				}
			}

		}
		console.log('Importing done');
	}
}

function loop_data_files(callback) {
	var files = fs.readdirSync(dataDir);
	files.forEach(function(file) {
		if (file.indexOf('.json') === -1) {
			return;
		}

		console.log('Loading file ' + file);

		var data = require(dataDir + file);
		data.data.forEach(function(series) {
			callback(data, series);
		});
	});
}

function find_current_index(datapoints) {
	var lastDiff = -1;
	var lastIndex = 0;

	// find current index
	for (var i = 0; i < datapoints.length; i++) {
		var point = datapoints[i];
		var date = new Date(point[1] * 1000);
		var now = new Date();

		date.setFullYear(now.getFullYear());
		date.setMonth(now.getMonth());
		date.setDate(now.getDate());

		var currentDiff = Math.abs(now.getTime() - date.getTime());
		if (lastDiff !== -1 && currentDiff > lastDiff) {
			break;
		}

		lastDiff = currentDiff;
		lastIndex = i;
	}

	return lastIndex;
}

function live_data() {
	var metrics = {};

	loop_data_files(live_feed);

	function live_feed(meta, series) {
		var key = _.template(meta.pattern, { target: series.target });
		metrics[key] = { points: series.datapoints };
		metrics[key].index = find_current_index(series.datapoints);
		metrics[key].secondsPerPoint = meta.secondsPerPoint;
		metrics[key].direction = 1;
	}

  _.each(['dc=eu', 'dc=us', 'dc=asia'], function(datacenter) {
    for (var i = 0; i < 1; i++) {
      var server = String(i);
      server = "000".substring(0, 3 - server.length) + server;
      metrics["servers." + datacenter + '.5.12.123.5.' + server + '.requests.count'] = {
        index: 0,
        secondsPerPoint: 10,
        direction: 0,
        points: [[1000]],
        randomWalk: true
      };
    }
  });

	var client = graphite.createClient(graphiteUrl);

	setInterval(function() {

		for (var key in metrics) {
			if (!metrics.hasOwnProperty(key)) {
				continue;
			}

			var metric = metrics[key];
			var current = metric.points[metric.index];

			if (metric.randomWalk) {
        current[0] += (Math.random() * 100) - (100 / 2);
			}

			// check if it is time to send next value
			if (metric.timestamp) {
				var diff = (new Date().getTime() - metric.timestamp.getTime()) / 1000;
				if (diff < metric.secondsPerPoint) {
					continue;
				}
			}

			if (current[0]) {
				var data = {};
				data[key] = current[0];

				if (program.debug) {
					console.log('sending: ' + key + ' value: ' + current[0]);
				}

				client.write(data);
			}

			metric.timestamp = new Date();
			metric.index = metric.index + metric.direction;

			if (metric.index === -1 || metric.index === metric.points.length) {
				metric.direction = metric.direction * -1;
				metric.index = metric.index + metric.direction;
			}
		}

	}, 1000);

}

function live_opentsdb() {
  var restify = require('restify');
  var client = restify.createJsonClient({ url: 'http://localhost:4242' });
  var data = {};

  function randomWalk(name, tags, start, variation) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);

    client.post('/api/put', {
        metric: name,
        timestamp: new Date().getTime(),
        value: data[name],
        tags: tags
    }, function(err, res) {
      console.log("writing opentsdb metric: " + err);
    });
  }

  setInterval(function() {
    randomWalk('logins.count', { source: 'backend', hostname: 'server1' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server2' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server3' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server4' }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server1' }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server2' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server1' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2);
  }, 10000);
}

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

  function randomWalk(name, tags, start, variation) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);

    client.post('/write', {
      "database": "site",
      "points": [
        {
          "name": name,
          "tags": tags,
          "timestamp": new Date().getTime(),
          "precision": "ms",
          "fields": {
            "value": data[name]
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
    randomWalk('logins.count', { source: 'backend', hostname: 'server1' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server2' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server3' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server4' }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server1' }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server2' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server1' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2);
  }, 10000);
}

function live_kairosdb() {
  var restify = require('restify');
  var client = restify.createJsonClient({ url: 'http://localhost:8280' });
  var data = {};

  function randomWalk(name, tags, start, variation) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);

    client.post('/api/v1/datapoints', [{
      "name": name,
      "timestamp": new Date().getTime(),
      "value": data[name],
      "tags": tags,
    }], function(err, res) {
      if (err) {
        console.log("writing kariosdb metric error: " + err);
      }
    });
  }

  setInterval(function() {
    randomWalk('logins.count', { source: 'backend', hostname: 'server1' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server2' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server3' }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server4' }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server1' }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server2' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server1' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2' }, 100, 2);
  }, 10000);
}
