#!/bin/bash

# Cloudflare Tunnel Management Script for Paperless MCP Server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TUNNEL_NAME=${CLOUDFLARE_TUNNEL_NAME:-"paperless-mcp"}

show_usage() {
    echo -e "${BLUE}Cloudflare Tunnel Management${NC}"
    echo "============================"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./tunnel.sh [COMMAND]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  status      Show tunnel status"
    echo "  start       Start the tunnel"
    echo "  stop        Stop the tunnel"
    echo "  restart     Restart the tunnel"
    echo "  logs        Show tunnel logs"
    echo "  install     Install cloudflared"
    echo "  setup       Setup new tunnel"
    echo "  list        List all tunnels"
    echo ""
}

check_cloudflared() {
    if ! command -v cloudflared &> /dev/null; then
        echo -e "${RED}❌ cloudflared not found${NC}"
        echo "   Run: ./tunnel.sh install"
        return 1
    fi
    return 0
}

install_cloudflared() {
    echo -e "${BLUE}📦 Installing cloudflared...${NC}"
    if command -v brew &> /dev/null; then
        brew install cloudflared
    else
        echo -e "${YELLOW}⚠️  Homebrew not found. Please install manually:${NC}"
        echo "   https://github.com/cloudflare/cloudflared/releases"
    fi
}

tunnel_status() {
    if ! check_cloudflared; then
        return 1
    fi
    
    echo -e "${BLUE}📡 Cloudflare Tunnel Status${NC}"
    echo "=========================="
    
    if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
        echo -e "${GREEN}✅ Tunnel '$TUNNEL_NAME' exists${NC}"
        
        if pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" > /dev/null; then
            echo -e "${GREEN}✅ Tunnel '$TUNNEL_NAME' is running${NC}"
            echo ""
            echo "Process details:"
            pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" | xargs ps -p
        else
            echo -e "${YELLOW}⚠️  Tunnel '$TUNNEL_NAME' exists but is not running${NC}"
        fi
    else
        echo -e "${RED}❌ Tunnel '$TUNNEL_NAME' does not exist${NC}"
        echo "   Run: ./tunnel.sh setup"
    fi
}

start_tunnel() {
    if ! check_cloudflared; then
        return 1
    fi
    
    if pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" > /dev/null; then
        echo -e "${YELLOW}⚠️  Tunnel '$TUNNEL_NAME' is already running${NC}"
        return 0
    fi
    
    echo -e "${BLUE}🚀 Starting tunnel '$TUNNEL_NAME'...${NC}"
    nohup cloudflared tunnel run "$TUNNEL_NAME" > /tmp/cloudflared-$TUNNEL_NAME.log 2>&1 &
    
    sleep 2
    
    if pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" > /dev/null; then
        echo -e "${GREEN}✅ Tunnel started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start tunnel${NC}"
        echo -e "${BLUE}📋 Check logs: ./tunnel.sh logs${NC}"
    fi
}

stop_tunnel() {
    echo -e "${BLUE}🛑 Stopping tunnel '$TUNNEL_NAME'...${NC}"
    
    if pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" > /dev/null; then
        pkill -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME"
        echo -e "${GREEN}✅ Tunnel stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Tunnel '$TUNNEL_NAME' is not running${NC}"
    fi
}

show_logs() {
    local log_file="/tmp/cloudflared-$TUNNEL_NAME.log"
    
    if [[ -f "$log_file" ]]; then
        echo -e "${BLUE}📋 Tunnel logs for '$TUNNEL_NAME':${NC}"
        echo "================================="
        tail -f "$log_file"
    else
        echo -e "${RED}❌ Log file not found: $log_file${NC}"
    fi
}

setup_tunnel() {
    if ! check_cloudflared; then
        return 1
    fi
    
    echo -e "${BLUE}🔧 Setting up new tunnel '$TUNNEL_NAME'...${NC}"
    
    # Create tunnel
    cloudflared tunnel create "$TUNNEL_NAME"
    
    # Get tunnel ID
    local tunnel_id=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
    
    # Create config
    local config_dir="$HOME/.cloudflared"
    local config_file="$config_dir/config.yml"
    
    mkdir -p "$config_dir"
    
    cat > "$config_file" << EOF
tunnel: $tunnel_id
credentials-file: $config_dir/$tunnel_id.json

ingress:
  - hostname: $TUNNEL_NAME.your-domain.com
    service: http://localhost:3000
  - service: http_status:404
EOF
    
    echo -e "${GREEN}✅ Tunnel setup complete!${NC}"
    echo -e "${YELLOW}⚠️  Please update the hostname in: $config_file${NC}"
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "   1. Edit $config_file with your domain"
    echo "   2. Add DNS record: $TUNNEL_NAME.your-domain.com"
    echo "   3. Run: ./tunnel.sh start"
}

list_tunnels() {
    if ! check_cloudflared; then
        return 1
    fi
    
    echo -e "${BLUE}📋 All Cloudflare Tunnels:${NC}"
    echo "========================"
    cloudflared tunnel list
}

case "${1:-}" in
    status)
        tunnel_status
        ;;
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    restart)
        stop_tunnel
        sleep 1
        start_tunnel
        ;;
    logs)
        show_logs
        ;;
    install)
        install_cloudflared
        ;;
    setup)
        setup_tunnel
        ;;
    list)
        list_tunnels
        ;;
    *)
        show_usage
        ;;
esac