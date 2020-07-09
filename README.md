fake-data-gen
=============

Fake data writer for Grafana datasources. The writer target different datasources based on two environment variables. FD_DATASOURCE and FD_PORT. The ip to write to is assumed to be local host.

If you want to add a new datasource please use the metrics found in /data to produce metrics like the other datasources. This will make it easier for grafana developers to get up to speed faster with your datasource.

The container build by this repo is used by datasource containers in grafana/grafana/docker/blocks
