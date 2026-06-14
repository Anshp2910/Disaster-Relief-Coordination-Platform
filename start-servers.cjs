const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname);

const server = spawn('node', ['server/src/index.js'], {
  cwd: root,
  stdio: 'ignore',
  detached: true,
});
server.unref();

const client = spawn('npx', ['vite', '--host'], {
  cwd: path.join(root, 'client'),
  stdio: 'ignore',
  detached: true,
});
client.unref();

console.log(`Server PID: ${server.pid}`);
console.log(`Client PID: ${client.pid}`);
console.log('Both started. Servers are running as background processes.');
