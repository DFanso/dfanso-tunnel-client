const WebSocket = require('ws');
const http = require('http');
const chalk = require('chalk');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Tunnel server is running\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active tunnels
const tunnels = new Map();

wss.on('connection', (ws) => {
  console.log(chalk.green('New client connected'));
  let clientId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(chalk.cyan('Received message:'), message);

      if (message.type === 'register') {
        clientId = message.subdomain || Math.random().toString(36).substring(7);
        tunnels.set(clientId, {
          ws,
          port: message.port
        });
        
        console.log(chalk.green(`Registered tunnel for subdomain: ${clientId} -> localhost:${message.port}`));
        
        // Send confirmation
        ws.send(JSON.stringify({
          type: 'registered',
          subdomain: clientId
        }));
      }
    } catch (error) {
      console.error(chalk.red('Error processing message:'), error);
    }
  });

  ws.on('close', () => {
    console.log(chalk.yellow('Client disconnected'));
    if (clientId) {
      tunnels.delete(clientId);
      console.log(chalk.yellow(`Removed tunnel for subdomain: ${clientId}`));
    }
  });

  ws.on('error', (error) => {
    console.error(chalk.red('WebSocket error:'), error);
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(chalk.green(`Tunnel server running on ws://localhost:${PORT}`));
  console.log(chalk.cyan('Ready to accept connections...'));
});
