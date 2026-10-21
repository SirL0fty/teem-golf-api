#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
import json
from pathlib import Path

path = Path(".cursor/environment.json")
data = json.loads(path.read_text())
if not isinstance(data, dict):
    raise SystemExit("environment.json must be an object")
name = data.get("name")
install = data.get("install")
if not isinstance(name, str) or not name.strip():
    raise SystemExit("environment.json name must be a non-empty string")
if install != "bash .cursor/cloud-install.sh":
    raise SystemExit("environment.json install must be bash .cursor/cloud-install.sh")
print("environment.json ok")
PY

clean=0
if [ ! -d node_modules ] || [ ! -f libs/utils/dist/index.js ]; then
  clean=1
fi

first="$(bash .cursor/cloud-install.sh)"
printf '%s\n' "$first"
if [ "$clean" -eq 1 ] && printf '%s\n' "$first" | grep -qx 'cloud-install: no-op'; then
  echo "first install on a clean tree must do work" >&2
  exit 1
fi

before="$(stat -c '%Y %n' node_modules libs/utils/dist/index.js)"
second="$(bash .cursor/cloud-install.sh)"
printf '%s\n' "$second"
after="$(stat -c '%Y %n' node_modules libs/utils/dist/index.js)"

if [ "$second" != "cloud-install: no-op" ]; then
  echo "second install must be a no-op" >&2
  exit 1
fi
if [ "$before" != "$after" ]; then
  echo "second install changed node_modules or libs/utils/dist/index.js" >&2
  exit 1
fi
