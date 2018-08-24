const axios = require('axios');

const DEFAULT_INTERVAL = 1;
let interval = DEFAULT_INTERVAL;
let verbose = true;

let randomWalkData = {};

function randomWalk(name, min=0, max=+Infinity, start=0, variation=2) {
  if (!randomWalkData[name]) {
    randomWalkData[name] = start;
  }
  const add = (Math.random() * variation) - (variation / 2);
  if (randomWalkData[name] + add < min || randomWalkData[name] + add > max) {
    randomWalkData[name] -= add;
  } else {
    randomWalkData[name] += add;
  }
  return randomWalkData[name];
}

const metrics = [
  { name: 'cpu', min: 0, max: 100, start: 10, variation: 5 },
  { name: 'memory', min: 0, max: 1000000000, start: 1000000, variation: 100000000 },
  { name: 'disk', min: 0, max: 100000000000, start: 10000000000, variation: 1000000000 },
];
const servers = ['backend_01', 'backend_02', 'backend_03', 'backend_04', 'frontend_01', 'frontend_02'];
const datacenters = ['Europe', 'America', 'Asia'];

function live(program, config) {
  const accountId = program.accountId;
  const apiKey = program.apiKey;

  if (!accountId || !apiKey) {
    throw new Error('Please, specify New Relic Insights API key and account ID');
  }

  function send() {
    const timestamp = new Date().valueOf()/1000;
    let data = [];

    metrics.forEach(metric => {
      servers.forEach(server => {
        datacenters.forEach(dc => {
          const metric_name = `${metric.name}_${dc}`;
          const value = randomWalk(metric_name, metric.min, metric.max, metric.start, metric.variation);
          const event = {
            eventType: metric.name,
            host: server,
            datacenter: dc,
            value: value,
            timestamp: timestamp
          };
          data.push(event);
          if (verbose) {
            console.log(event);
          }
        });
      });
    });

    axios({
      method: 'POST',
      url: `https://insights-collector.newrelic.com/v1/accounts/${accountId}/events`,
      headers: {
        'Content-Type': 'application/json',
        'X-Insert-Key': apiKey
      },
      data
    })
    .catch(err => console.error(err));
  }

  setInterval(() => {
    send();
    // send(getRandomInt(0, 1000), new Date().valueOf()/1000 - 86400);
  }, interval * 1000);
}

module.exports = {
  live: live
};
