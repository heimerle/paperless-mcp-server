#!/bin/bash

# Paperless MCP Server Configuration
# Copy this file to config.sh and customize your settings

# Paperless-ngx connection settings
export PAPERLESS_URL="http://192.168.178.10:8010"
export PAPERLESS_TOKEN="your-api-token-here"

# MCP Transport settings
export MCP_TRANSPORT="stdio"  # or "http"
export MCP_PORT="3000"        # Only used for HTTP transport

# Uncomment and customize for your setup:
# export PAPERLESS_URL="https://your-paperless.example.com"
# export PAPERLESS_TOKEN="your-actual-token"
# export MCP_TRANSPORT="http"
# export MCP_PORT="3001"

echo "✅ Personal configuration loaded:"
echo "   PAPERLESS_URL: $PAPERLESS_URL"
echo "   PAPERLESS_TOKEN: ${PAPERLESS_TOKEN:+[CONFIGURED]}${PAPERLESS_TOKEN:-[NOT SET]}"
echo "   MCP_TRANSPORT: $MCP_TRANSPORT"
echo "   MCP_PORT: $MCP_PORT"
echo ""
echo "Now run: ./start.sh"