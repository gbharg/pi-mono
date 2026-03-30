#!/bin/bash
# Serialized git access wrapper for macOS
# Usage: .pi/scripts/git-lock.sh <git command args>
# Uses mkdir-based locking (atomic on all filesystems)

LOCK_DIR="/tmp/pi-agent-git.lock"
MAX_WAIT=30

# Acquire lock
acquired=false
for i in $(seq 1 $MAX_WAIT); do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    acquired=true
    # Clean up on exit
    trap "rmdir '$LOCK_DIR' 2>/dev/null" EXIT
    break
  fi
  sleep 1
done

if [ "$acquired" = false ]; then
  echo "ERROR: Could not acquire git lock after ${MAX_WAIT}s." >&2
  exit 1
fi

git "$@"
