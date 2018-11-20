#!/bin/sh

hostip=$(ip route show | awk '/default/ {print $3}')

echo $hostip

: "${FD_DATASOURCE:=graphite}"
: "${FD_PORT:=2003}"
: "${FD_SERVER:=$hostip}"
: "${FD_GRAPHITE_VERSION:=0.9}"

: "${FD_NR_API_KEY:=""}"
: "${FD_NR_ACCOUNT_ID:=""}"

: "${FD_DD_API_KEY:=""}"
: "${FD_DD_APP_KEY:=""}"

echo $FD_DATASOURCE
echo $FD_PORT
echo $FD_SERVER
echo $FD_GRAPHITE_VERSION

params="--${FD_DATASOURCE} --server ${FD_SERVER} --port ${FD_PORT} --live --import --days 3 --graphite-version ${FD_GRAPHITE_VERSION}"
if [ "$FD_DATASOURCE" = "newrelic" ]; then
  params="$params --apiKey ${FD_NR_API_KEY} --accountId ${FD_NR_ACCOUNT_ID}"
fi
if [ "$FD_DATASOURCE" = "datadog" ]; then
  params="$params --apiKey ${FD_DD_API_KEY} --appKey ${FD_DD_APP_KEY}"
fi
echo $params
node app.js $params
