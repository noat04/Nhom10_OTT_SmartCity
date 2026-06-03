#!/usr/bin/env node
require('dotenv').config();

const app = require('./src/app');
const debug = require('debug')('nhom10-be:server');
const http = require('http');
const connectMongoDB = require('./src/config/mongodb');
const socketUtil = require('./src/utils/socket');

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);

connectMongoDB().then(() => {
  socketUtil.init(server);
  server.listen(port, '0.0.0.0');
  server.on('error', onError);
  server.on('listening', onListening);
});

function normalizePort(val) {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') throw error;
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log(`Server is running at http://localhost:${port}`);
}
