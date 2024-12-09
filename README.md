# @dfanso/tunnel-client

A powerful command-line tool that creates secure WebSocket tunnels to expose your local servers to the internet. Perfect for development, testing, and sharing your local work with others.

![Version](https://img.shields.io/npm/v/@dfanso/tunnel-client)
![License](https://img.shields.io/npm/l/@dfanso/tunnel-client)

## Features

- **Instant Tunnels**: Create secure tunnels to your local servers in seconds
- **Secure WebSocket**: Uses `wss://` for secure connections
- **Custom Subdomains**: Choose your own subdomain or get a random one
- **Auto Port Detection**: Automatically finds available ports for the tunnel server
- **Request Logging**: Detailed logging of incoming requests and responses
- **Error Handling**: Robust error handling and informative error messages

## Installation

```bash
# Install globally (recommended)
sudo npm install -g @dfanso/tunnel-client

# Or install locally in your project
npm install @dfanso/tunnel-client
```

## Quick Start

1. Start a tunnel:
```bash
ltunnel start
```

2. Follow the interactive prompts:
   - Enter the local port to tunnel (e.g., 3000, 8000)
   - Choose a subdomain (optional)
   - Confirm the tunnel server details

3. Your tunnel is ready! You'll see:
   - Local server URL
   - Public tunnel URL
   - Connection status

## Usage Examples

### Basic Usage
```bash
# Start a tunnel with interactive prompts
ltunnel start

# Start a tunnel with specific port
ltunnel start --port 3000

# Start a tunnel with custom subdomain
ltunnel start --port 3000 --subdomain myapp
```

### Common Scenarios

#### Development Server
```bash
# Start your development server
npm run dev  # Usually runs on port 3000

# In another terminal, start the tunnel
ltunnel start --port 3000
```

#### API Testing
```bash
# Start your API server
node server.js  # Running on port 8000

# Create a tunnel to expose your API
ltunnel start --port 8000 --subdomain myapi
```

## Configuration

The tunnel client connects to:
- Default Server: `dfanso.dev`
- Default Port: `8080`
- Protocol: `wss://` (WebSocket Secure)

You can override these settings during tunnel creation.

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :[PORT]
   
   # Kill the process
   kill -9 [PID]
   ```

2. **Connection Timeout**
   - Verify the tunnel server is running
   - Check your internet connection
   - Ensure the port isn't blocked by a firewall

3. **Permission Denied**
   - Use `sudo` for global installation
   - Check file permissions

## Development

Want to contribute? Great!

1. Clone the repo:
```bash
git clone https://github.com/dfanso/dfanso-tunnel-client.git
cd dfanso-tunnel-client
```

2. Install dependencies:
```bash
npm install
```

3. Start developing:
```bash
npm start
```

## License

MIT [dfanso](https://github.com/dfanso)

## Support

Having issues? [Open an issue](https://github.com/dfanso/dfanso-tunnel-client/issues) on GitHub.
