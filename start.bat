@echo off
start "Server" node server/src/index.js
cd client
start "Client" npx vite --host
echo Both servers started!
