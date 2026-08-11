@echo off
set PORT=8765
start "" http://localhost:%PORT%/
py -m http.server %PORT% --bind 127.0.0.1
