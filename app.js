var program = require('commander');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var graphite = require('graphite');
var pkg = require('./package.json');

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
					client.write(metric, currentDate);
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

