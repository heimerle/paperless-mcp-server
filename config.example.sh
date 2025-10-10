#!/bin/bash

# Paperless MCP Server Configuration
# Copy this file to config.sh and customize your settings

# Paperless-ngx connection settings
export PAPERLESS_URL="http://localhost:8000"
export PAPERLESS_TOKEN="your-api-token-here"

# MCP Transport settings
export MCP_TRANSPORT="stdio"  # or "http"
export MCP_PORT="3000"        # Only used for HTTP transport

# Ngrok Tunnel settings (for HTTP transport + public access)
export USE_NGROK_TUNNEL="false"  # Set to "true" to enable ngrok tunnel
export NGROK_AUTH_TOKEN=""       # Optional: Your ngrok auth token for custom domains/features
export NGROK_REGION="us"         # Ngrok region: us, eu, ap, au, sa, jp, in

# Uncomment and customize for your setup:
# export PAPERLESS_URL="https://your-paperless.example.com"
# export PAPERLESS_TOKEN="your-actual-token"
# export MCP_TRANSPORT="http"
# export MCP_PORT="3001"
# export USE_NGROK_TUNNEL="true"
# export NGROK_AUTH_TOKEN="your-ngrok-token"

echo "✅ Personal configuration loaded:"
echo "   PAPERLESS_URL: $PAPERLESS_URL"
echo "   PAPERLESS_TOKEN: ${PAPERLESS_TOKEN:+[CONFIGURED]}${PAPERLESS_TOKEN:-[NOT SET]}"
echo "   MCP_TRANSPORT: $MCP_TRANSPORT"
echo "   MCP_PORT: $MCP_PORT"
echo "   NGROK_TUNNEL: ${USE_NGROK_TUNNEL:-false}"
echo ""
echo "Now run: ./start.sh"