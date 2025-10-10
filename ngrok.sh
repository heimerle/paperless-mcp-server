#!/bin/bash

# Ngrok Tunnel Management for Paperless MCP Server
# Replaces Cloudflare Tunnel with stable ngrok solution

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_info() {
    echo -e "${CYAN}ℹ  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check ngrok installation
check_ngrok() {
    if ! command -v ngrok &> /dev/null; then
        log_error "ngrok not found"
        echo ""
        log_info "Install ngrok with:"
        echo "  macOS:   brew install ngrok"
        echo "  Linux:   snap install ngrok"
        echo "  Manual:  https://ngrok.com/download"
        echo ""
        return 1
    fi
    return 0
}

# Get tunnel status
get_tunnel_status() {
    local pid=$(pgrep -f "ngrok http" || true)
    if [ -z "$pid" ]; then
        return 1
    fi
    echo "$pid"
    return 0
}

# Get tunnel URL from ngrok API
get_tunnel_url() {
    curl -s http://localhost:4040/api/tunnels 2>/dev/null | \
        grep -o '"public_url":"https://[^"]*"' | \
        head -1 | \
        cut -d'"' -f4
}

# Start ngrok tunnel
start_tunnel() {
    local port=${1:-3000}
    local region=${2:-us}
    
    log_header "Starting Ngrok Tunnel"
    
    check_ngrok || exit 1
    
    # Check if already running
    local existing_pid=$(get_tunnel_status)
    if [ ! -z "$existing_pid" ]; then
        local url=$(get_tunnel_url)
        if [ ! -z "$url" ]; then
            log_success "Tunnel already running (PID: $existing_pid)"
            log_info "URL: ${CYAN}$url${NC}"
            log_info "Dashboard: ${CYAN}http://localhost:4040${NC}"
            return 0
        else
            log_warning "Tunnel process found but not responding, restarting..."
            kill $existing_pid 2>/dev/null || true
            sleep 2
        fi
    fi
    
    log_info "Starting ngrok tunnel to http://localhost:$port (region: $region)..."
    
    # Start ngrok in background
    ngrok http $port --region=$region --log=ngrok.log --log-format=json > /dev/null 2>&1 &
    local pid=$!
    
    log_success "Ngrok started (PID: $pid)"
    
    # Wait for URL
    log_info "Waiting for tunnel URL..."
    for i in {1..30}; do
        local url=$(get_tunnel_url)
        if [ ! -z "$url" ]; then
            log_success "Tunnel ready!"
            echo ""
            log_info "Public URL: ${CYAN}$url${NC}"
            log_info "Dashboard:  ${CYAN}http://localhost:4040${NC}"
            echo ""
            
            # Save URL
            echo "$url" > .tunnel_url
            return 0
        fi
        sleep 1
        echo -n "."
    done
    echo ""
    
    log_error "Timeout waiting for tunnel URL"
    log_info "Check ngrok.log or http://localhost:4040"
    return 1
}

# Stop ngrok tunnel
stop_tunnel() {
    log_header "Stopping Ngrok Tunnel"
    
    local pid=$(get_tunnel_status)
    if [ -z "$pid" ]; then
        log_info "No tunnel running"
        return 0
    fi
    
    log_info "Stopping tunnel (PID: $pid)..."
    kill $pid 2>/dev/null || true
    sleep 1
    
    # Force kill if still running
    if kill -0 $pid 2>/dev/null; then
        log_warning "Force killing tunnel..."
        kill -9 $pid 2>/dev/null || true
    fi
    
    log_success "Tunnel stopped"
    rm -f .tunnel_url 2>/dev/null
}

# Show tunnel status
show_status() {
    log_header "Ngrok Tunnel Status"
    
    check_ngrok || return 1
    
    local pid=$(get_tunnel_status)
    if [ -z "$pid" ]; then
        log_info "Status: ${RED}Not running${NC}"
        return 0
    fi
    
    log_success "Status: Running (PID: $pid)"
    
    local url=$(get_tunnel_url)
    if [ ! -z "$url" ]; then
        echo ""
        log_info "Public URL: ${CYAN}$url${NC}"
        log_info "Dashboard:  ${CYAN}http://localhost:4040${NC}"
        echo ""
        log_info "Test endpoints:"
        echo "  • Health:  ${CYAN}$url/health${NC}"
        echo "  • MCP API: ${CYAN}$url/api${NC}"
    else
        log_warning "Tunnel running but URL not available"
        log_info "Check dashboard at http://localhost:4040"
    fi
}

# Show tunnel logs
show_logs() {
    if [ ! -f "ngrok.log" ]; then
        log_warning "No log file found (ngrok.log)"
        return 1
    fi
    
    log_header "Ngrok Logs (last 50 lines)"
    tail -50 ngrok.log | jq -r '"\(.t) [\(.lvl)] \(.msg)"' 2>/dev/null || tail -50 ngrok.log
}

# Setup ngrok auth token
setup_auth() {
    local token=$1
    
    if [ -z "$token" ]; then
        log_error "Usage: $0 setup <your-ngrok-auth-token>"
        log_info "Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken"
        return 1
    fi
    
    log_header "Setup Ngrok Auth Token"
    
    check_ngrok || return 1
    
    log_info "Configuring auth token..."
    ngrok config add-authtoken "$token" > /dev/null 2>&1
    
    log_success "Auth token configured!"
    log_info "You can now use custom domains and other premium features"
}

# Main command dispatcher
case "${1:-status}" in
    start)
        start_tunnel "${2:-3000}" "${3:-us}"
        ;;
    stop)
        stop_tunnel
        ;;
    restart)
        stop_tunnel
        sleep 2
        start_tunnel "${2:-3000}" "${3:-us}"
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    setup)
        setup_auth "$2"
        ;;
    url)
        url=$(get_tunnel_url)
        if [ -z "$url" ]; then
            log_warning "No tunnel running"
            exit 1
        fi
        echo "$url"
        ;;
    *)
        echo "Ngrok Tunnel Management"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  start [port] [region]  Start ngrok tunnel (default: port 3000, region us)"
        echo "  stop                   Stop ngrok tunnel"
        echo "  restart [port]         Restart ngrok tunnel"
        echo "  status                 Show tunnel status and URL"
        echo "  logs                   Show ngrok logs"
        echo "  setup <token>          Configure ngrok auth token"
        echo "  url                    Print tunnel URL only"
        echo ""
        echo "Regions: us, eu, ap, au, sa, jp, in"
        echo ""
        exit 1
        ;;
esac
