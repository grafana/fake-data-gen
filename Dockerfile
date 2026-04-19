FROM node:24-alpine@sha256:8510330d3eb72c804231a834b1a8ebb55cb3796c3e4431297a24d246b8add4d5

COPY ./src /usr/src/fake-data-gen
WORKDIR /usr/src/fake-data-gen
RUN npm install

CMD [ "sh", "-c", "/usr/src/fake-data-gen/start.sh" ]
