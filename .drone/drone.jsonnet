local pipeline(name) = {
  kind: 'pipeline',
  name: name,
  trigger: {
    event: ['push', 'pull_request'],
    branch: ['master', 'main'],
  },
  volumes: [
    {
      name: 'docker',
      host: {
        path: '/var/run/docker.sock',
      },
    },
  ],
};

local step(name, image, commands) = {
  name: name,
  image: image,
  commands: commands,
  volumes: [
    {
      name: 'docker',
      path: '/var/run/docker.sock',
    },
  ],
};

local secret(name, vault_path, vault_key) = {
  kind: 'secret',
  name: name,
  get: {
    path: vault_path,
    name: vault_key,
  },
};
local docker_username_secret = secret('docker_username', 'infra/data/ci/docker_hub', 'username');
local docker_password_secret = secret('docker_password', 'infra/data/ci/docker_hub', 'password');

[
  docker_username_secret,
  docker_password_secret,
  pipeline('build') {
    steps: [
      step('build', 'docker:20-git', [
        'apk add make',
        'make build',
      ]),
      step('push', 'docker:20-git', [
        'apk add make',
        'make push',
      ]) {
        when: {
          event: ['push'],
          branch: ['master', 'main'],
        },
      },
    ],
  },
]
