var vertica = require('vertica');

var CREATE_TABLE_QUERY = "CREATE TABLE IF NOT EXISTS grafana_metric (" +
  "measurement VARCHAR(64), " +
  "source VARCHAR(64), " +
  "hostname VARCHAR(64), " +
  "datacenter VARCHAR(64), " +
  "createdAt TIMESTAMP, " +
  "value FLOAT " +
")";

function live(program, config) {
  console.log('connecting to ' + program.server + ' : ' + program.port);

  var verticaConfig = {
    host: program.server,
    port: program.port,
    user: config.user,
    password: config.pwd,
    database: config.db,
    ssl: 'optional'
  };

  var connection = vertica.connect(verticaConfig);


  function onCreateTable(err, result) {
    console.log(err, result);

    if (!err) {
      runRandomWalk();
    }
  }

  var data = {};

  function randomWalk(metric, start, variation) {
    if (!data[metric.measurement]) {
      data[metric.measurement] = start;
    }

    data[metric.measurement] += (Math.random() * variation) - (variation / 2);
    var timestamp = new Date();
    metric.createdAt = timestamp.toISOString().replace('T', ' ').replace('Z', '');
    metric.value = data[metric.measurement];

    insert_query = "INSERT INTO grafana_metric (measurement, source, hostname, datacenter, createdAt, value) VALUES (" +
    "'" + metric.measurement + "', " +
    "'" + metric.source + "', " +
    "'" + metric.hostname + "', " +
    "'" + metric.datacenter + "', " +
    "'" + metric.createdAt + "', " +
    metric.value +
    ")";
    console.log(insert_query);

    connection.query(insert_query, onInsertQuery);
  }

  function onInsertQuery(err, result) {
    console.log(err, result);
    connection.query("COMMIT");
  }

  function runRandomWalk() {
    setInterval(function() {
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: '10.1.100.1', datacenter: "America" }, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: '10.1.100.10', datacenter: "America" }, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: 'server1', datacenter: "America" }, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: 'server2', datacenter: "America"}, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: 'server3', datacenter: "Europe"}, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: 'asd/ space/ metric', datacenter: "Europe"}, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: 'asd2\\ asd\\1', datacenter: "Europe"}, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: 'server4', datacenter: "Europe"}, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: 'server\\5', datacenter: "Asia"}, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'backend', hostname: 'server/7', datacenter: "Africa"}, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'site', hostname: 'server1', datacenter: "America" }, 100, 2);
      randomWalk({ measurement: 'logins.count', source: 'site', hostname: 'server2', datacenter: "America" }, 100, 2);
      randomWalk({ measurement: 'cpu', source: 'site', hostname: 'server1', datacenter: "America" }, 100, 2);
      randomWalk({ measurement: 'cpu', source: 'site', hostname: 'server2', datacenter: "America" }, 100, 2);
      randomWalk({ measurement: 'cpu', source: 'site', hostname: 'server2', datacenter: "America" }, 100, 2);
      randomWalk({ measurement: 'payment.started', source: 'frontend', hostname: 'server2', datacenter: "America" }, 1000, 5);
      randomWalk({ measurement: 'payment.started', source: 'frontend', hostname: 'server1', datacenter: "America"  }, 1000, 5);
      randomWalk({ measurement: 'payment.ended', source: 'frontend', hostname: 'server1', datacenter: "America"  }, 1000, 5);
      randomWalk({ measurement: 'payment.ended', source: 'frontend', hostname: 'server1', datacenter: "America"  }, 1000, 5);
    }, 10000);
  }

  var createTableRes = connection.query(CREATE_TABLE_QUERY, onCreateTable);
}

module.exports = {
  live: live
};
