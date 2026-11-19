#!/usr/bin/env bash
set -euo pipefail
kubectl get pods -l app=demo-web-app -w
