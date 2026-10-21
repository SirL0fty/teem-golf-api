#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pin="$(sed -n 's/^[[:space:]]*"packageManager"[[:space:]]*:[[:space:]]*"bun@\([^"]*\)".*/\1/p' package.json)"
if [ -z "$pin" ]; then
  echo "package.json packageManager must be bun@<version>" >&2
  exit 1
fi

is_pin() {
  local bin="$1"
  [ -n "$bin" ] && [ -x "$bin" ] && [ "$("$bin" --version 2>/dev/null || true)" = "$pin" ]
}

export PATH="/usr/local/bin:${HOME}/.bun/bin:${PATH}"
hash -r

if is_pin "$(command -v bun 2>/dev/null || true)" && [ -d node_modules ] && [ -f libs/utils/dist/index.js ]; then
  echo "cloud-install: no-op"
  exit 0
fi

pin_bin=""
if is_pin "$(command -v bun 2>/dev/null || true)"; then
  pin_bin="$(command -v bun)"
elif is_pin "${HOME}/.bun/bin/bun"; then
  pin_bin="${HOME}/.bun/bin/bun"
else
  curl -fsSL https://bun.sh/install | bash -s "bun-v${pin}"
  pin_bin="${HOME}/.bun/bin/bun"
  if ! is_pin "$pin_bin"; then
    echo "installed bun is not ${pin}" >&2
    exit 1
  fi
fi

# Link only a binary whose version matches packageManager. An older ~/.bun/bin/bun must not replace a pin already on PATH.
if ! is_pin /usr/local/bin/bun; then
  if [ -w /usr/local/bin ]; then
    ln -sf "$pin_bin" /usr/local/bin/bun
  else
    sudo ln -sf "$pin_bin" /usr/local/bin/bun
  fi
fi

export PATH="/usr/local/bin:${HOME}/.bun/bin:${PATH}"
hash -r

if ! is_pin "$(command -v bun)"; then
  echo "bun on PATH is not ${pin}" >&2
  exit 1
fi

bun install --frozen-lockfile
bunx nx run-many -t build
