#!/usr/bin/env bash
# Commit toutes les modifications et pousse sur origin/main.
# Usage:
#   ./scripts/push-github.sh
#   ./scripts/push-github.sh "Message de commit"

set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-chore: de fictice à déployable}"

if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  git add -A
  git commit -m "$MSG"
else
  echo "Rien à committer (working tree propre)."
fi

git push origin main
echo "OK — poussé sur origin main."
