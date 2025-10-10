#!/bin/bash

echo "🧪 MCP SSE Verbindungs-Test"
echo "==========================="
echo ""

TUNNEL_URL="${1:-https://plug-geometry-programs-arc.trycloudflare.com}"

echo "📡 Teste SSE-Verbindung zu: $TUNNEL_URL/mcp"
echo ""

# SSE-Verbindung für 5 Sekunden aufbauen und alle Events zeigen
timeout 5s curl -N -H "Accept: text/event-stream" "$TUNNEL_URL/mcp" 2>&1 || true

echo ""
echo "✅ Test abgeschlossen"
