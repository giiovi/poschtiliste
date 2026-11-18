#!/bin/sh
# checks the required settings before jenkins starts
set -eu

if [ -z "${JENKINS_ADMIN_PASSWORD:-}" ]; then
  echo "JENKINS_ADMIN_PASSWORD must be set in .env" >&2
  exit 1
fi

# the multibranch job uses the token credential only when a token is configured, otherwise it scans anonymously
if [ -n "${GITHUB_TOKEN:-}" ]; then
  export GITHUB_CREDENTIALS_ID=github-token
else
  export GITHUB_CREDENTIALS_ID=
fi

exec /usr/local/bin/jenkins.sh "$@"
