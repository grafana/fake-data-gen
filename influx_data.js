var _ = require('lodash');

function live() {
  var restify = require('restify');
  var client = restify.createJsonClient({ url: 'http://localhost:8086' });
  var data = { derivative: 0 };

  var influxClient = require('influx')({ host : 'localhost', username : 'grafana', password : 'grafana', database : 'site' });

  client.basicAuth('grafana', 'grafana');
  client.get('/query?q=' + encodeURIComponent("CREATE USER grafana WITH PASSWORD 'grafana' WITH ALL PRIVILEGES"), function(err, res) {
    console.log("CREATE USER\n\t" + err);

    client.get('/query?q=' + encodeURIComponent('CREATE DATABASE site'), function(err, res) {
      console.log("CREATE site DATABASE\n\t" + err);
    });

    client.get('/query?q=' + encodeURIComponent('CREATE RETENTION POLICY bar ON site DURATION 1d REPLICATION 1 DEFAULT'), function(err, res) {
      console.log("CREATE RETENTION POLICY\n\t" + err);
    });

    client.get('/query?q=' + encodeURIComponent('CREATE RETENTION POLICY "1m_avg" ON site DURATION 10d REPLICATION 1'), function(err, res) {
      console.log("CREATE RETENTION POLICY\n\t" + err);
    });

    client.get('/query?q=' + encodeURIComponent('CREATE RETENTION POLICY "5m_avg" ON site DURATION 100d REPLICATION 1'), function(err, res) {
      console.log("CREATE RETENTION POLICY\n\t" + err);
    });

    var cq = `CREATE CONTINUOUS QUERY "1m_avg"
                ON site
                BEGIN
                SELECT mean(value) as value
                INTO "1m_avg".:measurement
                FROM /.*/
                GROUP BY time(1m), *
                END`;

    client.get('/query?q=' + encodeURIComponent(cq), function(err, res) {
      console.log("CREATE ROLLUP CQ\n\t" + err);
    });

    cq = `CREATE CONTINUOUS QUERY "5m_avg"
                ON site
                BEGIN
                SELECT mean(value) as value
                INTO "5m_avg".:measurement
                FROM /.*/
                GROUP BY time(5m), *
                END`
    client.get('/query?q=' + encodeURIComponent(cq), function(err, res) {
      console.log("CREATE ROLLUP CQ\n\t" + err);
    });
  });

  function randomWalk(name, tags, start, variation) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);

    influxClient.writePoint(name, { value: data[name] }, tags, function(err, res) {
      if (err) {
        console.log("randomWalk: ", err);
      }
    });
  }

  function derivativeTest() {
    data.derivative += 100;

    influxClient.writePoint("derivative", { value: data.derivative }, {}, function(err, res) {
      if (err) {
        console.log("derivativeTest: ", err);
      }
    });
  }

  var logCount = 0;
  function writeLogEntry() {
    logCount++;

    var tags = {'type': 'deploy', 'server': 'server-01'};
    var values = {
      "message": 'deployed app',
      "description": 'influxdb log entry: ' + logCount,
      "more": 'more text',
      "tags_csv": "deploy,server1",
      "unescaped": "breaking <br /> the <br /> row <br />",
      "detail": "For more see <a href='http://google.com' target='_blank'>Incident Report</a>",
    };

    influxClient.writePoint('logs', values, tags, function(err, res) {
      if (err) {
        console.log("writeLogEntry: ", err);
      }
    });

    setTimeout(writeLogEntry, Math.random() * 900000);
  }

  setInterval(function() {
    randomWalk('logins.count', { source: 'backend', hostname: '10.1.100.1', datacenter: "America" }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: '10.1.100.10', datacenter: "America" }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server1', datacenter: "America" }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server2', datacenter: "America"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server3', datacenter: "Europe"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server4', datacenter: "Europe"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server\\5', datacenter: "Asia"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server/7', datacenter: "Africa"}, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server1', datacenter: "America" }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server2', datacenter: "America" }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server1', datacenter: "America" }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2', datacenter: "America" }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2', datacenter: "America" }, 100, 2);
    randomWalk('payment.started', { source: 'frontend', hostname: 'server2', datacenter: "America" }, 1000, 5);
    randomWalk('payment.started', { source: 'frontend', hostname: 'server1', datacenter: "America"  }, 1000, 5);
    randomWalk('payment.ended', { source: 'frontend', hostname: 'server1', datacenter: "America"  }, 1000, 5);
    randomWalk('payment.ended', { source: 'frontend', hostname: 'server1', datacenter: "America"  }, 1000, 5);
    derivativeTest();
  }, 10000);

  writeLogEntry();
}

module.exports = {
  live: live
};
