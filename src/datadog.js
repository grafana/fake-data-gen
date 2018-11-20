const _ = require('lodash');
const axios = require('axios');

const EVENT_PROBABILITY = 0.01;
const DEFAULT_INTERVAL = 1;
let interval = DEFAULT_INTERVAL * 1;
let verbose = true;

const servers = ['backend_01', 'backend_02', 'backend_03', 'backend_04', 'frontend_01', 'frontend_02'];
const datacenters = ['Europe', 'America', 'Asia'];
const events = [
  { title: 'CPU load too high', text: 'CPU load too high', alert_type: 'warning', source_type_name: 'cpu' },
  { title: 'Disk overloaded', text: 'Disk overloaded', alert_type: 'error', source_type_name: 'disk' },
  {
    title: 'App deployed',
    text: 'Application was successfully deployed',
    alert_type: 'info',
    source_type_name: 'deploy',
    tags: ['app:frontend'],
  },
  {
    title: 'App deployed',
    text: 'Application was successfully deployed',
    alert_type: 'success',
    source_type_name: 'deploy',
    tags: ['app:backend'],
  },
];

function live(program, config) {
  const appKey = program.appKey;
  const apiKey = program.apiKey;

  if (!appKey || !apiKey) {
    throw new Error('Please, specify Datadog API and application keys');
  }

  if (verbose) {
    console.log('Starting live event streaming');
  }

  function sendEvents() {
    const isFired = Math.random() < EVENT_PROBABILITY;
    const eventIndex = Math.floor(Math.random() * 4);
    const dcIndex = Math.floor(Math.random() * datacenters.length);
    const serverIndex = Math.floor(Math.random() * servers.length);
    const dc = datacenters[dcIndex];
    const server = servers[serverIndex];
    const firedEvent = _.cloneDeep(events[eventIndex]);
    if (isFired) {
      const timestamp = new Date().valueOf()/1000;
      let event = firedEvent;
      event.timestamp = timestamp;
      if (!event.tags) {
        event.tags = [];
      }
      event.tags.push(`datacenter:${dc}`);
      event.tags.push(`server:${server}`);
      if (verbose) {
        console.log(event);
      }
      const data = event;
      pushEvent(data, apiKey, appKey);
    }
  }

  setInterval(() => {
    sendEvents();
  }, interval * 1000);
}

function pushEvent(eventData, apiKey, appKey) {
  axios({
    method: 'POST',
    url: `https://api.datadoghq.com/api/v1/events`,
    headers: {
      'Content-Type': 'application/json',
    },
    params: {
      api_key: apiKey,
      application_key: appKey,
    },
    data: eventData
  })
  .catch(err => {
    if (err.response && err.response.data && err.response.data.errors) {
      console.error(`Status: ${err.response.status}: ${err.response.statusText}\n${err.response.data.errors}`);
    } else {
      console.error(err);
    }
  });
}

module.exports = {
  live: live
};
