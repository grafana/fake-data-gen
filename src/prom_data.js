const client = require("prom-client")
const express = require('express');
const server = express();
const register = client.register;

/**
 * Adapting the prom-client example to work with gdev-prometheus
 * https://github.com/siimon/prom-client/blob/master/example/server.js
 */

// Create custom metrics
const Histogram = client.Histogram;
const h = new Histogram({
  name: 'test_histogram',
  help: 'Example of a histogram',
  labelNames: ['code', 'color'],
});

const Counter = client.Counter;
const c = new Counter({
  name: 'test_counter',
  help: 'Example of a counter',
  labelNames: ['code'],
});

new Counter({
  name: 'fake_data_gen_scrapes_total',
  help: 'Number of scrapes (example of a counter with a collect fn)',
  collect() {
    // collect is invoked each time `register.metrics()` is called.
    this.inc();
  },
});

const Gauge = client.Gauge;
const g = new Gauge({
  name: 'test_gauge',
  help: 'Example of a gauge',
  labelNames: ['method', 'code'],
});

const work = () => {
// Set metric values to some random values for demonstration
  setTimeout(() => {
    h.labels('200', 'blue').observe(Math.floor(Math.random() * 200));
    h.labels('300', 'red').observe(Math.random());
    h.labels('300', 'blue').observe(Math.random());
    h.labels('200', 'red').observe(1 - (Math.random() / 10));

    h.observe(Math.random());
  }, 999);

  setInterval(() => {
    c.inc({ code: Math.random() > 0.99 ? 500 : 200 });
  }, 5000);

  setInterval(() => {
    c.inc({ code: Math.random() < 0.07 ? 400 : Math.random() > 0.05 ? 414 : 200 })
  }, 2000);

  setInterval(() => {
    c.inc({code: 200});
  }, 2000);

  setInterval(() => {
    g.set({ method: 'get', code: Math.random() > 0.95 ? 500 : 200 }, Math.random());
    g.set(Math.random());
    g.labels('post', '300').inc();
  }, 100);

  client.collectDefaultMetrics({
    timeout: 10000,
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5] // These are the default buckets.
  });
}

// Setup server to Prometheus scrapes:
server.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

server.get('/metrics/counter', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.getSingleMetricAsString('test_counter'));
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Hardcoded to 9091 since that is the port gdev-prom is using to scrape
const port = 9091;

module.exports = {
  live: () => {
    console.log(
        `Server listening to ${port}, metrics exposed on /metrics endpoint`,
    );
    server.listen(port);
    work();
  }
};
