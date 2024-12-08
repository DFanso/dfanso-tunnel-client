const WebSocket = require('ws');
const http = require('http');
const { EventEmitter } = require('events');

class TunnelManager extends EventEmitter {
  constructor() {
    super();
    this.tunnels = new Map();
  }

  async addTunnel(config) {
    const tunnelId = Math.random().toString(36).substring(7);
    const tunnel = new Tunnel(config, tunnelId);
    
    await tunnel.start();
    this.tunnels.set(tunnelId, tunnel);
    
    tunnel.on('error', (error) => {
      console.error(`Tunnel ${tunnelId} error:`, error);
      this.stopTunnel(tunnelId);
    });

    return {
      id: tunnelId,
      localPort: config.localPort,
      serverPort: config.serverPort,
      serverIp: config.serverIp,
      subdomain: config.subdomain || tunnelId
    };
  }

  async stopTunnel(tunnelId) {
    const tunnel = this.tunnels.get(tunnelId);
    if (tunnel) {
      await tunnel.stop();
      this.tunnels.delete(tunnelId);
    }
  }

  listTunnels() {
    return Array.from(this.tunnels.entries()).map(([id, tunnel]) => ({
      id,
      ...tunnel.config
    }));
  }

  async stopAll() {
    const promises = Array.from(this.tunnels.keys()).map(id => this.stopTunnel(id));
    await Promise.all(promises);
  }
}

class Tunnel extends EventEmitter {
  constructor(config, id) {
    super();
    this.config = config;
    this.id = id;
    this.localServer = null;
    this.ws = null;
    this.targetPort = parseInt(config.localPort);
  }

  async start() {
    // Create local HTTP server for tunneling
    this.localServer = http.createServer(this.handleLocalRequest.bind(this));
    
    // Find a random available port for the tunnel server
    await new Promise((resolve, reject) => {
      this.localServer.listen(0, 'localhost', (err) => {
        if (err) {
          reject(err);
        } else {
          const address = this.localServer.address();
          console.log(`Tunnel server listening on port ${address.port}`);
          resolve();
        }
      });
    });

    await this.connectToTunnelServer();
    return this;
  }

  handleLocalRequest(req, res) {
    console.log('Tunnel server received request:', req.method, req.url);
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      console.log('Request body:', body);

      // Forward request to target server
      const options = {
        hostname: 'localhost',
        port: this.targetPort, // Use the target port, not the tunnel server port
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `localhost:${this.targetPort}`
        }
      };

      console.log(`Forwarding request to target server at port ${this.targetPort}`);
      const targetReq = http.request(options, (targetRes) => {
        res.writeHead(targetRes.statusCode, targetRes.headers);

        targetRes.on('data', chunk => {
          res.write(chunk);
        });

        targetRes.on('end', () => {
          res.end();
        });
      });

      targetReq.on('error', (error) => {
        console.error('Error forwarding request:', error);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Error forwarding request',
          details: error.message,
          targetPort: this.targetPort
        }));
      });

      if (body) {
        targetReq.write(body);
      }
      targetReq.end();
    });
  }

  async connectToTunnelServer() {
    const wsUrl = `wss://${this.config.serverIp}:${this.config.serverPort}`;
    console.log(`Connecting to tunnel server at ${wsUrl}`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl, {
        rejectUnauthorized: false // Only for testing, remove in production
      });

      this.ws.on('open', () => {
        console.log('Connected to tunnel server');
        
        // Register the tunnel
        const registration = {
          type: 'register',
          subdomain: this.config.subdomain || this.id,
          port: this.localServer.address().port
        };
        
        console.log('Sending registration:', registration);
        this.ws.send(JSON.stringify(registration));
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Received message:', message);

          if (message.type === 'request') {
            this.handleTunnelRequest(message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('Connection closed');
        this.emit('error', new Error('WebSocket connection closed'));
      });
    });
  }

  handleTunnelRequest(message) {
    const { clientId, method, path, headers, body } = message;
    console.log('Handling tunnel request:', method, path);

    const options = {
      hostname: 'localhost',
      port: this.targetPort, // Use the target port
      path: path,
      method: method,
      headers: {
        ...headers,
        host: `localhost:${this.targetPort}`
      }
    };

    console.log(`Forwarding tunnel request to target server at port ${this.targetPort}`);
    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        console.log('Target server response:', responseBody);
        
        this.ws.send(JSON.stringify({
          type: 'response',
          clientId: clientId,
          statusCode: res.statusCode,
          headers: res.headers,
          data: Buffer.from(responseBody).toString('base64')
        }));
      });
    });

    req.on('error', (error) => {
      console.error('Error making local request:', error);
      this.ws.send(JSON.stringify({
        type: 'error',
        clientId: clientId,
        error: error.message,
        details: {
          targetPort: this.targetPort,
          error: error.code
        }
      }));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  }

  async stop() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.localServer) {
      await new Promise(resolve => this.localServer.close(resolve));
    }
  }
}

module.exports = TunnelManager;
