#!/usr/bin/env bash

set -euo pipefail

bash "$(cd "$(dirname "$0")" && pwd)/push.sh" main "${1:-Update}"
