FROM node:22-alpine@sha256:dbcedd8aeab47fbc0f4dd4bffa55b7c3c729a707875968d467aaaea42d6225af

COPY ./src /usr/src/fake-data-gen
WORKDIR /usr/src/fake-data-gen
RUN npm install

CMD [ "sh", "-c", "/usr/src/fake-data-gen/start.sh" ]
