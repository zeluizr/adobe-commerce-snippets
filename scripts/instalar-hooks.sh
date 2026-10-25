#!/usr/bin/env bash
# Apunta el git de este clon a los hooks versionados en .githooks/. Un clon nuevo no
# los usa hasta correr esto.
set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

git config core.hooksPath .githooks
chmod +x .githooks/* scripts/*.sh 2>/dev/null || true
printf 'Hooks instalados: core.hooksPath = %s\n' "$(git config core.hooksPath)"
