var _ = require('lodash');
var Prometheus = require("prometheus-client");
var NewClient = require("prom-client")

function live() {
  var client = new Prometheus();

  let loginsClient = new NewClient.Counter({
    labelNames: ['server', 'app', 'geohash'],
    name: "logins",
    help: "Counters",
  })

  let requestsCounter = new NewClient.Counter({
    name: "requests",
    help: "Counters",
    labelNames: ['server', 'app', 'geohash'],
  });

  client.listen(9091);

  function randomWalk(labels, variation) {
    loginsClient.labels(labels).inc(variation);
    // logins.increment(labels, (Math.random() * variation) - (variation / 2));
    requestsCounter.labels(labels).inc(100 + (Math.random() * 10));
  }

  setInterval(function() {
    randomWalk({server: "backend-01", app: "backend", geohash: "9wvfgzurfzb"}, 2);
    randomWalk({server: "backend-02", app: "backend", geohash: "dre33fzyxcrz"}, 2);
    randomWalk({server: "webserver-01", app: "frontend", geohash: "dr199bpvpcru"}, 2);
    randomWalk({server: "webserver-02", app: "frontend", geohash: "9yy21uzzxypg"}, 2);
    randomWalk({server: "webserver_03", app: "frontend", geohash: "gc6j7crvrcpf"}, 2);
    randomWalk({server: "webserver.03", app: "frontend", geohash: "u6g9zuxvxypv"}, 2);
  }, 10000);
}

module.exports = {
  live: live
};
