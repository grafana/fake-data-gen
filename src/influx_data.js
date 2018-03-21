var _ = require('lodash');

function live(server, port) {
  console.log('connecting to ' + server + ' : ' + port);
  var restify = require('restify');
  var client = restify.createJsonClient({ url: 'http://' + server +':' + port });
  var data = { derivative: 0 };

  var Influx = require('influx');
  var influx = new Influx.InfluxDB({
    host: server,
    database: 'site',
    port: port,
    username: 'grafana',
    password: 'grafana',
    schema: []
  })

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

    influx.writePoints([
      {
        measurement: name,
        fields: {value: data[name]},
        tags: tags
      }
    ]).catch(function (err) {
      console.log("randomWalk: ", err);
    });
  }

  function derivativeTest() {
    data.derivative += 100;

    influx.writePoints([
      {
        measurement: 'derivative',
        fields: {value: data.derivative},
        tags: {}
      }
    ]).catch(function (err) {
      console.log("derivative: ", err);
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

    influx.writePoints([
      {
        measurement: 'logs',
        fields: values,
        tags: tags
      }
    ]).catch(function (err) {
      console.log("writeLogEntry: ", err);
    });

    setTimeout(writeLogEntry, Math.random() * 900000);
  }

  setInterval(function() {
    randomWalk('logins.count', { source: 'backend', hostname: '10.1.100.1', datacenter: "America", geohash: "9wvfgzurfzb" }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: '10.1.100.10', datacenter: "America", geohash: "dre33fzyxcrz" }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server1', datacenter: "America", geohash: "dr199bpvpcru" }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server2', datacenter: "America", geohash: "9yy21uzzxypg"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server3', datacenter: "Europe", geohash: "gc6j7crvrcpf"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'asd/ space/ metric', datacenter: "Europe", geohash: "u6g9zuxvxypv"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'asd2\\ asd\\1', datacenter: "Europe", geohash: "gbsuv7ztq111"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server4', datacenter: "Europe", geohash: "gcp03b022111"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server\\5', datacenter: "Asia", geohash: "tgcpegxbpbzu"}, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server/7', datacenter: "Africa", geohash: "kd3ezvxvxypc"}, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server1', datacenter: "America", geohash: "tz4vytepg111" }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server2', datacenter: "America", geohash: "wjms0jyr5111" }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server1', datacenter: "America", geohash: "wj7c61wnv111" }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2', datacenter: "America", geohash: "tz6h548nc111" }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2', datacenter: "America", geohash: "wr50zpuhj111" }, 100, 2);
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
