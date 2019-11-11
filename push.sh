#/bin/sh
VERSION=v8

docker build -t grafana/fake-data-gen:latest -t grafana/fake-data-gen:$VERSION --no-cache=true .

docker push grafana/fake-data-gen:latest
docker push grafana/fake-data-gen:$VERSION
