var _ = require('lodash');

function live() {
  var restify = require('restify');
  var client = restify.createJsonClient({url: 'http://localhost'});
  client.basicAuth('admin', 'admin');
  var data = {};

  console.log('Starting Grafana Live Fake Data Feeder');

  function randomWalk(name, tags, start, variation) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);

    client.post('/grafana/api/streams/push', {
      "stream": "fake." + name,
      "series": [
        {
          "name": name,
          "delta": true,
          "datapoints": [[new Date().getTime(), data[name]]],
        }
      ]
    }, function(err, res) {
      if (err) {
        console.log("writing grafana live error: " + err);
      }
    });
  }

  setInterval(function() {
    randomWalk('payments');
    randomWalk('logins');
  }, 2000);

}

module.exports = {
  live: live
};
