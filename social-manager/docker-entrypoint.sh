#!/bin/sh
set -eu
mkdir -p /data
chown node:node /data
chmod 700 /data
exec runuser -u node -- "$@"
