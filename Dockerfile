FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94

COPY ./src /usr/src/fake-data-gen
WORKDIR /usr/src/fake-data-gen
RUN npm install

CMD [ "sh", "-c", "/usr/src/fake-data-gen/start.sh" ]
