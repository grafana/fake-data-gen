var _ = require('lodash');
var Prometheus = require("prometheus-client");

function live() {
  var client = new Prometheus();

  var counters = client.newCounter({
    namespace: "counters",
    name: "logins",
    help: "Counters"
  });

  client.listen(9091);
  var data = {};

  function randomWalk(counter, labels, variation) {
    counter.increment(labels, (Math.random() * variation) - (variation / 2));
  }

  setInterval(function() {
    randomWalk(counters, {server: "backend-01", app: "backend"}, 2);
    randomWalk(counters, {server: "backend-02", app: "backend"}, 2);
    randomWalk(counters, {server: "webserver-01", app: "frontend"}, 2);
    randomWalk(counters, {server: "webserver-02", app: "frontend"}, 2);
  }, 10000);
}

module.exports = {
  live: live
};
