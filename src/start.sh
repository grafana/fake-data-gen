#!/bin/sh

hostip=$(ip route show | awk '/default/ {print $3}')

echo $hostip

: "${FD_DATASOURCE:=graphite}"
: "${FD_PORT:=2003}"

echo $FD_DATASOURCE
echo $FD_PORT

params="--${FD_DATASOURCE} --server ${hostip} --port ${FD_PORT} --live --import --days 3"
echo $params
node app.js $params
