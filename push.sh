#/bin/sh
VERSION=v3

docker build -t grafana/fake-data-gen:latest -t grafana/fake-data-gen:$VERSION --no-cache=true .

docker push grafana/fake-data-gen:latest
docker push grafana/fake-data-gen:$VERSION
