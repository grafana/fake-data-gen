var _ = require('lodash');
var Prometheus = require("prometheus-client");

function getLabels(base, number, missingLinkRatio) {
  console.log(`creating ${number} labels with base name '${base}' and missingLinkRatio ${missingLinkRatio}`);
  const missingLinks = {};
  const labels = [];
  for (let i = 0; i < number; i++) {
    const src_label = `${base}_${i}`;
    for (let j = 0; j < number; j++) {
      if (i !== j && i < j && Math.random() < missingLinkRatio) {
        // console.log('missing', i, j);
        if (missingLinks[j]) {
          missingLinks[j].push(i)
        } else {
          missingLinks[j] = [i];
        }
        continue;
      }

      const dst_label = `${base}_${j}`;
      if (i !== j && !(missingLinks[i] && missingLinks[i].includes(j))) {
        const label = { src: src_label, dst: dst_label };
        // console.log(label);
        labels.push(label);
      }
    }
  }
  // console.log(missingLinks);
  return labels;
}

function live(labelsNum, missingLinkRatio) {
  var client = new Prometheus();
  const test_label_sets = getLabels('switch', labelsNum || 100, missingLinkRatio || 0.3);
  console.log('Starting to feed data');

  var packets = client.newCounter({
    namespace: "counters",
    name: "packets",
    help: "Counters"
  });

  var latency = client.newCounter({
    namespace: "counters",
    name: "latency",
    help: "Counters"
  });


  client.listen(9095);
  var data = {};

  function randomWalk(labels, variation) {
    packets.increment(labels, 1000 + (Math.random() * 1000));
    latency.increment(labels, Math.abs((Math.random() * variation) - (variation / 2)));
  }

  setInterval(function() {
    test_label_sets.forEach(function(label_set) {
      randomWalk(label_set, 2);
    });
  }, 30000);
}

module.exports = {
  live: live
};
