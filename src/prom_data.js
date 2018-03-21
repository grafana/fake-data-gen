var _ = require('lodash');
var Prometheus = require("prometheus-client");

function live() {
  var client = new Prometheus();

  var logins = client.newCounter({
    namespace: "counters",
    name: "logins",
    help: "Counters"
  });

  var requests = client.newCounter({
    namespace: "counters",
    name: "requests",
    help: "Counters"
  });


  client.listen(9091);
  var data = {};

  function randomWalk(labels, variation) {
    logins.increment(labels, (Math.random() * variation) - (variation / 2));
    requests.increment(labels, 100 + (Math.random() * 10));
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
