# 🚀 Smart Startup Scripts

This repository includes intelligent startup scripts that automatically handle all prerequisites and configuration.

## Quick Start (Zero Configuration)

Just run this command and everything will be set up automatically:

```bash
./run.sh
```

The script will:
- ✅ Create configuration from template if needed
- ✅ Auto-detect your Paperless-ngx instance
- ✅ Set up optimal transport mode
- ✅ Check all prerequisites
- ✅ Install dependencies if needed
- ✅ Build the project if needed
- ✅ Start the server

## Smart Features

### 🔍 Auto-Detection
- **Paperless-ngx Instance**: Automatically finds running Paperless instances on common ports
- **Transport Mode**: Chooses STDIO for local use, HTTP for remote/tunnel scenarios
- **Available Ports**: Finds free ports automatically
- **Environment**: Detects SSH/remote sessions

### 🛠️ Prerequisites Check
- **Node.js**: Verifies version (18+ recommended)
- **Dependencies**: Installs npm packages if missing
- **Build Status**: Rebuilds if source code is newer
- **API Connection**: Tests Paperless-ngx connectivity

### 🌐 Cloudflare Tunnel Support
- **Auto-Install**: Installs cloudflared if needed (with Homebrew)
- **Tunnel Creation**: Creates tunnels automatically
- **Configuration**: Generates tunnel config files
- **Status Management**: Checks and starts tunnels as needed

## Available Scripts

### `./run.sh` - Ultra-Simple Start
- Zero-configuration startup
- Perfect for first-time users
- Handles everything automatically

### `./start.sh` - Smart Start  
- Comprehensive prerequisites checking
- Intelligent configuration detection
- Automatic problem resolution

### `./tunnel.sh` - Tunnel Management
```bash
./tunnel.sh status      # Check tunnel status
./tunnel.sh start       # Start tunnel
./tunnel.sh stop        # Stop tunnel  
./tunnel.sh setup       # Set up new tunnel
./tunnel.sh logs        # View tunnel logs
```

## Configuration Files

### `config.sh` - Personal Configuration
```bash
export PAPERLESS_URL="http://192.168.178.10:8010"
export PAPERLESS_TOKEN="your-token-here"
export MCP_TRANSPORT="http"
export MCP_PORT="3000"
export USE_CLOUDFLARE_TUNNEL="false"
export CLOUDFLARE_TUNNEL_NAME="paperless-mcp"
```

### `config.example.sh` - Template
Safe template file that gets copied to `config.sh` on first run.

## Security

- ✅ `config.sh` is automatically excluded from Git
- ✅ Tokens are only stored locally
- ✅ Secure environment variable handling
- ✅ No credentials in command line arguments

## Troubleshooting

The scripts provide detailed error messages and suggestions:

```bash
❌ Node.js not found
   Install with: brew install node

⚠️  Cannot connect to Paperless-ngx at http://localhost:8000
   Check if Paperless-ngx is running and URL is correct

✅ All systems ready! Starting Paperless MCP Server...
```

## Advanced Usage

For specific scenarios, you can still override settings:

```bash
# Force STDIO mode
export MCP_TRANSPORT="stdio"
./start.sh

# Use specific port
export MCP_PORT="3001"
./start.sh

# Enable Cloudflare Tunnel
export USE_CLOUDFLARE_TUNNEL="true"
./start.sh
```

The smart scripts make running the Paperless MCP Server as simple as `./run.sh`! 🎉