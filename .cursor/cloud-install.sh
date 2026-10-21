#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pin="$(sed -n 's/^[[:space:]]*"packageManager"[[:space:]]*:[[:space:]]*"bun@\([^"]*\)".*/\1/p' package.json)"
if [ -z "$pin" ]; then
  echo "package.json packageManager must be bun@<version>" >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version)" != "$pin" ]; then
  curl -fsSL https://bun.sh/install | bash -s "bun-v${pin}"
else
  echo "bun ${pin} already present"
fi

# A login shell skips ~/.bashrc, so the Build snapshot needs bun on the default PATH.
if [ -x "${HOME}/.bun/bin/bun" ]; then
  if [ -w /usr/local/bin ]; then
    ln -sf "${HOME}/.bun/bin/bun" /usr/local/bin/bun
  else
    sudo ln -sf "${HOME}/.bun/bin/bun" /usr/local/bin/bun
  fi
fi

export PATH="/usr/local/bin:${HOME}/.bun/bin:${PATH}"
hash -r

bun install --frozen-lockfile
bunx nx run-many -t build
