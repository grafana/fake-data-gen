var program = require('commander');
var graphite = require('graphite');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var pkg = require('./package.json');
var elasticData = require('./elastic_data');
var elasticData6 = require('./elastic_data6');
var influxData = require('./influx_data');
var influxData08 = require('./influx_data08');
var promData = require('./prom_data');
var grafanaLive = require('./grafana_live');
var sqlData = require('./sql_data');
var verticaData = require('./vertica_data');

var dataDir = './data/';

program
  .version(pkg.version)
  .option('-g, --graphite', 'Graphite address')
  .option('--graphite-version <graphiteVersion>', 'Graphite version')
  .option('-i, --import', 'Run import for x days')
  .option('-l, --live', 'Live feed data')
  .option('-s, --server <server>', 'destination server')
  .option('-p, --port <port>', 'destination port')
  .option('-o, --opentsdb', 'Live feed data to opentsdb')
  .option('--influxdb', 'Live feed data to influxdb')
  .option('--influxdb08', 'Live feed data to influxdb08')
  .option('--kairosdb', 'Live feed data to kairosdb')
  .option('--elasticsearch', 'Live feed data to elasticsearch')
  .option('--elasticsearch6', 'Live feed data to elasticsearch 6.x')
  .option('--prom', 'Live feed data to prometheus')
  .option('--mysql', 'Live feed data to mysql')
  .option('--postgres', 'Live feed data to postgresql')
  .option('--mssql', 'Live feed data to mssql')
  .option('--vertica', 'Live feed data to Vertica')
  .option('--grafanaLive', 'Grafana Live Data')
  .option('-d, --days <days>', 'Days');

program.parse(process.argv);

var graphiteUrl = 'plaintext://' + program.server + ":" + program.port;

program.server = program.server || 'localhost';

if (program.import && program.graphite) {
  import_data(program.graphiteVersion);
}

if (program.live && program.graphite) {
  live_data(program.graphiteVersion);
}

if (program.opentsdb) {
  live_opentsdb();
}

if (program.prom) {
  promData.live();
}

if (program.grafanaLive) {
  grafanaLive.live();
}

if (program.influxdb) {
  influxData.live(program.server, program.port);
}

if (program.influxdb08) {
  influxData08.live();
}

if (program.kairosdb) {
  live_kairosdb();
}

if (program.elasticsearch) {
  elasticData.live(program);
}

if (program.elasticsearch6) {
  elasticData6.live(program);
}

if (program.mysql) {
  sqlData.live(program, {
    dialect: 'mysql',
    db: 'grafana',
    user: 'grafana',
    pwd: 'password'
  });
}

if (program.postgres) {
  sqlData.live(program, {
    dialect: 'postgres',
    db: 'grafana',
    user: 'grafana',
    pwd: 'password'
  });
}

if (program.mssql) {
  sqlData.live(program, {
    dialect: 'mssql',
    db: 'grafana',
    user: 'grafana',
    pwd: 'Password!'
  });
}

if (program.vertica) {
  verticaData.live(program, {
    db: 'docker',
    user: 'dbadmin',
    pwd: 'dbadmin'
  });
}

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});

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

function import_data(graphiteVersion) {
  if (!program.days) {
    console.log('need to specify number of days');
    program.help();
  }

  var client = graphite.createClient(graphiteUrl);

  loop_data_files(import_metric_data);

  function import_metric_data(meta, series) {
    var now = new Date();

    var key;
    if (graphiteVersion === '1.1') {
      // Convert to tagged format
      key = _.template(meta.pattern, { target: "" }).replace("..", ".");
      key += ";target=" + series.target;
    } else {
      key = _.template(meta.pattern, { target: series.target });
    }
    var index = find_current_index(series.datapoints);
    var currentDate = new Date();
    var secondsPerPoint = 10;
    var loops = 0;
    var direction = -1;
    var pointCount = series.datapoints.length;
    var metric = {};
    var point, value, i, factor;

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
        factor = meta.secondsPerPoint / secondsPerPoint;
        for (i = 0; i < factor; i++)	{
          point = series.datapoints[index];
          value = point[0] / factor;
          metric[key] = value;
          client.write(metric, currentDate);
          currentDate.setSeconds(currentDate.getSeconds() - secondsPerPoint);
        }

        index = index + direction;
      }
      else if (secondsPerPoint === meta.secondsPerPoint) {
        point = series.datapoints[index];
        metric[key] = point[0];
        client.write(metric, currentDate);
        currentDate.setSeconds(currentDate.getSeconds() - secondsPerPoint);
        index = index + direction;
      }
      else {
        // need to aggregate points
        factor = secondsPerPoint / meta.secondsPerPoint;
        value = null;
        for (i = 0; i < factor; i++)	{
          point = series.datapoints[index];
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
              console.log('error' + err);
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

function live_data(graphiteVersion) {
  var metrics = {};
  console.log('Feeding live data');

  loop_data_files(live_feed);

  function live_feed(meta, series) {
    var key;
    if (graphiteVersion === '1.1') {
      // Convert to tagged format
      key = _.template(meta.pattern, { target: "" }).replace("..", ".");
      key += ";target=" + series.target;
    } else {
      key = _.template(meta.pattern, { target: series.target });
    }

    metrics[key] = { points: series.datapoints };
    metrics[key].index = find_current_index(series.datapoints);
    metrics[key].secondsPerPoint = meta.secondsPerPoint;
    metrics[key].direction = 1;
  }

  var serversCount = 4;
  _.each(['dc=eu', 'dc=us', 'dc=asia'], function(datacenter) {
    for (var i = 1; i <= serversCount; i++) {
      var server = String(i);
      server = "server_" + "000".substring(0, 3 - server.length) + server;
      var serverMetric;
      if (graphiteVersion === '1.1') {
        serverMetric = "servers.requests.count;" + datacenter + ";server=" + server;
      } else {
        var dc = datacenter.substring(3);
        serverMetric = "servers." + dc + "." + server + ".requests.count";
      }
      metrics[serverMetric] = {
        index: 0,
        secondsPerPoint: 10,
        direction: 0,
        points: [[1000]],
        randomWalk: true
      };
    }
  });

  // lots of tagged series
  var datacenters = ['us-east-1', 'us-west-1', 'us-west-2', 'asia-1', 'eu-west-1'];
  var apps = ['notifications', 'logger', 'collector'];

  _.each(datacenters, function(datacenter) {
    _.each(apps, function(app) {
      for (var i = 0; i < 3; i++) {
        var server = String(i);
        server = "000".substring(0, 3 - server.length) + server;
        metrics['random-walk.count;dc=' + datacenter + ';app=' + app + ';server='+server] = {
          index: 0,
          secondsPerPoint: 10,
          direction: 0,
          points: [[1000]],
          randomWalk: true
        };
      }
    });
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
  var client = restify.createJsonClient({ url: 'http://' + program.server + ':4242' });
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

  function writeAnnotation(description, notes) {
    client.post('/api/annotation', {
      startTime: new Date().getTime() / 1000,
      description: description,
      notes: notes
    }, function(err, res) {
      console.log("writing opentsdb annotation: " + err);
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
    writeAnnotation('global annotation', 'this is a global opentsdb annotation');
  }, 10000);
}
