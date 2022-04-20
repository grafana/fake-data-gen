.PHONY: build push push-dev drone

IMAGE_NAME=grafana/fake-data-gen

ifeq (${CI}, true)
  VERSION_PREFIX=
else
  VERSION_PREFIX=dev-
endif
VERSION=${VERSION_PREFIX}$(shell git rev-parse --short HEAD)

build:
	docker build -t ${IMAGE_NAME}:latest .
	docker tag grafana/fake-data-gen:latest grafana/fake-data-gen:${VERSION}

push-dev: build
	docker push grafana/fake-data-gen:${VERSION}

push: build push-dev
	docker push grafana/fake-data-gen:latest

drone:
	drone jsonnet --stream --format --source .drone/drone.jsonnet --target .drone/drone.yml
	drone lint .drone/drone.yml --trusted
	drone sign --save grafana/fake-data-gen .drone/drone.yml || echo "You must set DRONE_SERVER and DRONE_TOKEN. These values can be found on your [drone account](http://drone.grafana.net/account) page."
