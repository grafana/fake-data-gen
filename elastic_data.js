var _ = require('underscore');

function liveFeedToLogstash() {
  console.log('Starting Elasticsearch Data Sender')

  var net = require('net');
  var client = new net.Socket();
  var data = {};

  function randomWalk(name, tags, start, variation) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);
    var message = {
      "@value": data[name],
      "@mtags": tags,
    }

    _.each(tags, function(value, key) {
      message['@' + key] = value;
    });

    client.write(JSON.stringify(message) + '\n');
  }

  client.connect(5000, '127.0.0.1', function() {
  });

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
  }, 10000);

}

module.exports = {
  live: liveFeedToLogstash
};
