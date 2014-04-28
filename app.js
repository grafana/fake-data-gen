var program = require('commander');
var fs = require('fs');
var path = require('path');
var graphite = require('graphite');
var pkg = require('./package.json');

var prefix = 'test.import.';
var dataDir = './data/';

program
  .version(pkg.version)
  .option('-g, --graphite <graphite>', 'Graphite address')
	.option('-i, --import', 'Run import for x days')
	.option('-l, --live', 'Live feed data')
	.option('-d, --days <days>', 'Days');

program.parse(process.argv);

if (!program.graphite) {
	console.log('Need to specify graphite address');
	program.help();
	return;
}

var graphiteUrl = 'plaintext://' + program.graphite + ':2003/';

if (program['import']) {
	import_data();
}

if (program.live) {
	live_data();
}

function import_data() {
	if (!program.days) {
		console.log('need to specify number of days');
		program.help();
	}

	var client = graphite.createClient(graphiteUrl);

	loop_data_files(import_metric_data, '.fill');

	function import_metric_data(name, datapoints) {
		var key = prefix + name;
		var now = new Date();

		console.log('Importing ' + key + ' days: ' + program.days);

		datapoints.forEach(function(point) {
			var value = point[0];

			for (var i = 0; i < program.days; i++) {
				var date = new Date(point[1] * 1000);
				date.setMonth(now.getMonth());
				date.setDate(now.getDate() - i);

				if (date.getTime() > now.getTime()) {
					continue;
				}

				var metrics = {};
				metrics[key] = value;
				client.write(metrics, date);
			}
		});

		console.log('Importing done');
	}
}

function loop_data_files(callback, pattern) {

	var files = fs.readdirSync(dataDir);
	files.forEach(function(file) {
		if (file.indexOf(pattern) === -1) {
			return;
		}

		console.log('Loading file ' + file);

		var data = require(dataDir + file);
		var metricName = file.substring(0, file.indexOf(pattern));

		data.forEach(function(series) {
			callback(metricName + '.' + series.target, series.datapoints);
		});
	});
}

function live_data() {
	var metrics = {};

	loop_data_files(live_feed, '.live');

	function live_feed(name, datapoints) {
		var key = prefix + name;

		metrics[key] = { points: datapoints };

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
		};

		metrics[key].index = lastIndex;
		metrics[key].secondsPerPoint = metrics[key].points[1][1] - metrics[key].points[0][1];
		console.log(key + ' secondsPerPoint: ' + metrics[key].secondsPerPoint);
	}

	var client = graphite.createClient(graphiteUrl);

	setInterval(function() {

		for (key in metrics) {
			if (!metrics.hasOwnProperty(key)) {
				continue;
			}

			var metric = metrics[key];
			var current = metric.points[metric.index];

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

				console.log('sending: ' + key + ' value: ' + current[0]);
				client.write(data);
			}

			metric.timestamp = new Date();
			metric.index = metric.index + 1;
			if (metric.index >= metric.points.length) {
				metric.index = 0;
			}
		}

	}, 1000);

}

/*setInterval(function() {

	counter += Math.random() * 10 - 5;

	var metrics = { highres: { test: counter } };

	sdc.increment('prod.apps.myfake.counter', counter); // Increment by one.
	sdc.increment('test.apps.myfake.counter', counter); // Increment by one.
	sdc.timing('prod.apps.myfake.timer', counter + (Math.random() * 100) - 50); // Calculates time diff

	client.write(metrics, function(err) {
	  if (err) {
	  	console.log('failed to write to graphite');
	  }
	});

}, 1000);*/

