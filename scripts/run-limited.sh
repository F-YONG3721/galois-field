#!/usr/bin/env bash
# Optional Linux cgroup resource boundary. Fails closed if user systemd is unavailable.
set -euo pipefail
if [[ ${1:-} != '--run' ]]; then
  echo 'Usage: bash scripts/run-limited.sh --run (from repository root)' >&2
  exit 2
fi
if [[ ! -f scripts/supervise-codex.mjs || ! -d .git ]]; then
  echo 'Must run from the root of an existing galois-field Git repository.' >&2
  exit 2
fi
if ! command -v systemd-run >/dev/null 2>&1; then
  echo 'systemd-run is unavailable; no unattended run started (no unrestricted fallback).' >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  echo 'Node is unavailable; no unattended run started.' >&2
  exit 2
fi
# These are upper limits, not guaranteed allocations. Adjustable ONLY by user before launch.
exec systemd-run --user --scope --same-dir \
  --property='MemoryMax=4G' \
  --property='TasksMax=256' \
  --property='CPUQuota=200%' \
  node scripts/supervise-codex.mjs --run
