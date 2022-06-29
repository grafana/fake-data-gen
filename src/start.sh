#!/bin/sh

hostip=$(ip route show | awk '/default/ {print $3}')

echo $hostip

: "${FD_DATASOURCE:=graphite}"
: "${FD_PORT:=2003}"
: "${FD_SERVER:=$hostip}"
: "${FD_GRAPHITE_VERSION:=0.9}"
: "${FD_NR_API_KEY:=""}"
: "${FD_NR_ACCOUNT_ID:=""}"
: "${FD_HEATMAP_LABELS_NUM:=""}"
: "${FD_HEATMAP_MISSING_LINK_RATIO:=""}"
: "${FD_NODE_MEMORY_SIZE:=""}"

echo $FD_DATASOURCE
echo $FD_PORT
echo $FD_SERVER
echo $FD_GRAPHITE_VERSION

if [ "$FD_DATASOURCE" = "promLinkedinHeatmap" ]; then
  echo "FD_HEATMAP_LABELS_NUM: $FD_HEATMAP_LABELS_NUM"
fi

params="--${FD_DATASOURCE} --server ${FD_SERVER} --port ${FD_PORT} --live --import --days 3 --graphite-version ${FD_GRAPHITE_VERSION}"
if [ "$FD_DATASOURCE" = "newrelic" ]; then
  params="$params --apiKey ${FD_NR_API_KEY} --accountId ${FD_NR_ACCOUNT_ID}"
fi
if [ "$FD_DATASOURCE" = "promLinkedinHeatmap" ]; then
  params="$params --linkedinHeatmapLabelsNum ${FD_HEATMAP_LABELS_NUM}"
fi
if [ ! -z "${FD_HEATMAP_MISSING_LINK_RATIO}" ]; then
  params="$params --linkedinMissingLinkRatio ${FD_HEATMAP_MISSING_LINK_RATIO}"
fi
echo $params

node_params=""
if [ ! -z "${FD_NODE_MEMORY_SIZE}" ]; then
  node_params="--max-old-space-size=${FD_NODE_MEMORY_SIZE}"
  echo $node_params
fi
node $node_params app.js $params
