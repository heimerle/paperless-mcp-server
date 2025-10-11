#!/bin/bash

# Wrapper script for Claude Desktop MCP integration
# Adds better error handling and startup delay

# Set default values if not provided
export PAPERLESS_URL="${PAPERLESS_URL:-http://localhost:8000}"
export MCP_TRANSPORT="${MCP_TRANSPORT:-stdio}"

# Check if PAPERLESS_TOKEN is set
if [[ -z "$PAPERLESS_TOKEN" ]]; then
    echo "Error: PAPERLESS_TOKEN environment variable is required" >&2
    exit 1
fi

# Small delay to ensure network is ready
sleep 1

# Start the MCP server
exec node /Users/michaelweinheimer/projects/Paperless-MCP/dist/index.js "$@"