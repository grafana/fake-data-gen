#!/bin/sh

hostip=$(ip route show | awk '/default/ {print $3}')

echo $hostip

: "${FD_DATASOURCE:=graphite}"
: "${FD_PORT:=2003}"
: "${FD_SERVER:=$hostip}"

echo $FD_DATASOURCE
echo $FD_PORT
echo $FD_SERVER

params="--${FD_DATASOURCE} --server ${FD_SERVER} --port ${FD_PORT} --live --import --days 3"
echo $params
node app.js $params
