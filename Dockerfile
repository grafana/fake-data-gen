FROM node:24-alpine@sha256:cd6fb7efa6490f039f3471a189214d5f548c11df1ff9e5b181aa49e22c14383e

COPY ./src /usr/src/fake-data-gen
WORKDIR /usr/src/fake-data-gen
RUN npm install

CMD [ "sh", "-c", "/usr/src/fake-data-gen/start.sh" ]
