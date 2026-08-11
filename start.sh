#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
PORT="${PORT:-8765}"
printf 'CDP disponibile su http://localhost:%s\n' "$PORT"
printf 'Premi Ctrl+C per chiudere il server.\n'
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1; xdg-open "http://localhost:$PORT" >/dev/null 2>&1 || true) &
elif command -v open >/dev/null 2>&1; then
  (sleep 1; open "http://localhost:$PORT" >/dev/null 2>&1 || true) &
fi
python3 -m http.server "$PORT" --bind 127.0.0.1
