const axios = require('axios');
const fs = require('fs');

const DEFAULT_INTERVAL = 1;

let apiKey = '';
let accountId = '';
let interval = DEFAULT_INTERVAL;
let verbose = false;

const ARGS = process.argv.slice(2);
ARGS.forEach(arg => {
  const [key, value] = arg.split('=');
  if (key === '-v' || key === '--verbose') {
    verbose = true;
  }
  if (key && value !== undefined) {
    if (key === '--apiKey') {
      apiKey = value;
    }
    if (key === '--accountId') {
      accountId = value;
    }
    if (key === '--interval') {
      interval = value;
    }
  }
});

// if(!fs.existsSync('config.json')) {
//   throw new Error('Please create config.json');
// }
let config = {};
try {
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
} catch(err) {
  console.log('Warning: can\'t find config.json');
}

if(!accountId && !config.ACCOUNT_ID) {
  throw new Error('Please, specify account ID (--accountId param)');
}
if(!apiKey && !config.API_KEY) {
  throw new Error('Please, specify API key (--apiKey param)');
}

const ACCOUNT_ID = accountId || config.ACCOUNT_ID;
const API_KEY = apiKey || config.API_KEY;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    url: `https://insights-collector.newrelic.com/v1/accounts/${ACCOUNT_ID}/events`,
    headers: {
      'Content-Type': 'application/json',
      'X-Insert-Key': API_KEY
    },
    data
  })
    .catch(err => console.error(err));
}

setInterval(() => {
  send();
  // send(getRandomInt(0, 1000), new Date().valueOf()/1000 - 86400);
}, interval * 1000);
