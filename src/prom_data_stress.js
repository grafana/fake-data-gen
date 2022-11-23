var _ = require('lodash');
var Prometheus = require("prometheus-client");
let totalCardinalityLimit = 0;

function live() {
  var client = new Prometheus();

  var logins = client.newCounter({
    namespace: "counters",
    name: "logins",
    help: "Counters"
  });

  client.listen(9091);

  function randomWalk(labels, variation) {
    logins.increment(labels, (Math.random() * variation) - (variation / 2));
  }

  function randomMetric(labels, variation) {
    const random = client.newCounter({
      namespace: "stress",
      name: `random_${makeid(20)}`,
      help: "Counters"
    });
    random.increment(labels, (Math.random() * variation) - (variation / 2));
  }

  /**
   * Not safe, but fast
   * @param length
   * @param nums
   * @returns {string}
   */
  function makeid(length, nums = true) {
    let result = '';
    const characters = nums ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() *
          charactersLength));
    }
    return result;
  }
  let interval = setInterval(function() {
    randomWalk({server: "backend-01", app: "backend", geohash: "9wvfgzurfzb"}, 2);
    randomWalk({server: "backend-02", app: "backend", geohash: "dre33fzyxcrz"}, 2);
    randomWalk({server: "webserver-01", app: "frontend", geohash: "dr199bpvpcru"}, 2);
    randomWalk({server: "webserver-02", app: "frontend", geohash: "9yy21uzzxypg"}, 2);
    randomWalk({server: "webserver_03", app: "frontend", geohash: "gc6j7crvrcpf"}, 2);
    randomWalk({server: "webserver.03", app: "frontend", geohash: "u6g9zuxvxypv"}, 2);

    // To test metrics with many labels
    // makeid(2) can create up to 1296 (36chars^2) labels/series for each webserver, giving us max of 12.9k series generated, but sparsely populated, to not consume all memory in prometheus
    for (let i = 0; i < 100; i++) {
      randomWalk({server: `webserver.${i}`, app: "frontend", geohash: makeid(2)}, 2);
      totalCardinalityLimit++
    }

    // This will create a bunch of random metrics
    for (let i = 0; i < 100; i++) {
      randomMetric({server: `webserver_random`, app: "random", geohash: 'v4t5bjbqzypz'}, 2);
      totalCardinalityLimit++
    }

    // 1 million max limit
    if(totalCardinalityLimit > 100000) {
      console.warn('Hit max cardinality limit!')
      clearInterval(interval)
    }
  }, 10000);
}

module.exports = {
  live: live
};
