var _ = require('lodash');

var Sequelize = require('sequelize');

function live(program, config) {
  console.log('connecting to ' + program.server + ' : ' + program.port);
  var data = {};
  var sequelize = new Sequelize({
    host: program.server,
    port: program.port,
    username: config.user,
    password: config.pwd,
    database: config.db,
    dialect: config.dialect,

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },

    operatorsAliases: false
  });

  const Metric = sequelize.define('metric', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    createdAt: Sequelize.DATE,
    source: Sequelize.STRING,
    hostname: Sequelize.STRING,
    datacenter: Sequelize.STRING,
    measurement: Sequelize.STRING,
    value: Sequelize.FLOAT
  }, {
    timestamps: false,
    tableName: 'grafana_metric',
  });

  // drop the table first and re-create it afterwards
  Metric.sync({force: true});

  function randomWalk(metric, start, variation) {
    if (!data[metric.measurement]) {
      data[metric.measurement] = start;
    }

    data[metric.measurement] += (Math.random() * variation) - (variation / 2);
    metric.createdAt = new Date();
    metric.value = data[metric.measurement];

    sequelize.sync()
      .then(() => Metric.create(metric))
      .catch(function (err) {
        console.log("randomWalk: ", err);
      });
  }

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

module.exports = {
  live: live
};
