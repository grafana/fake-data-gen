docker build -t grafana/fake-data-gen . \
  && docker run -t \
  --net="bridge" \
  -e "FD_DATASOURCE=prom" \
  -e "FD_PORT=9091" \
  grafana/fake-data-gen
