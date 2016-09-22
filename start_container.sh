docker build -t grafana/fake-data-gen . \
  && docker run -t \
  --net="bridge" \
  -e "FD_DATASOURCE=elasticsearch" \
  -e "FD_PORT=9200" \
  grafana/fake-data-gen
