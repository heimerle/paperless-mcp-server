#!/bin/bash

# Paperless MCP Server Smart Startup Script
# This script automatically checks prerequisites and starts the server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging helper functions
log_header() {
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

echo -e "${BLUE}🚀 Paperless MCP Server - Smart Startup${NC}"
echo "========================================"
echo ""

# Auto-detect and load configuration
auto_load_config() {
    if [[ -f "config.sh" ]]; then
        echo -e "${BLUE}📁 Loading configuration from config.sh...${NC}"
        source config.sh
        return 0
    else
        echo -e "${YELLOW}⚠️  No config.sh found, creating from template...${NC}"
        if [[ -f "config.example.sh" ]]; then
            cp config.example.sh config.sh
            echo -e "${GREEN}✅ Created config.sh from template${NC}"
            echo -e "${CYAN}📝 Please edit config.sh with your settings and run again${NC}"
            exit 0
        else
            echo -e "${RED}❌ No config template found${NC}"
            return 1
        fi
    fi
}

# Smart configuration detection
smart_config_detection() {
    echo -e "${BLUE}🔍 Smart configuration detection...${NC}"
    
    # Only auto-detect transport if not explicitly configured
    if [[ -z "$MCP_TRANSPORT" ]] || [[ "$MCP_TRANSPORT" == "stdio" && ("$USE_CLOUDFLARE_TUNNEL" == "true" || -n "$SSH_CLIENT" || -n "$SSH_TTY") ]]; then
        # Auto-detect if we should use HTTP transport based on environment
        if [[ -n "$SSH_CLIENT" ]] || [[ -n "$SSH_TTY" ]] || [[ "$USE_CLOUDFLARE_TUNNEL" == "true" ]]; then
            MCP_TRANSPORT="http"
            echo -e "${CYAN}   Detected remote/tunnel environment → HTTP transport${NC}"
        else
            # Check if we're in a terminal that supports stdio
            if [[ -t 0 ]] && [[ -t 1 ]]; then
                MCP_TRANSPORT="stdio"
                echo -e "${CYAN}   Detected interactive terminal → STDIO transport${NC}"
            else
                MCP_TRANSPORT="http"
                echo -e "${CYAN}   Non-interactive environment → HTTP transport${NC}"
            fi
        fi
    else
        echo -e "${CYAN}   Using configured transport mode: $MCP_TRANSPORT${NC}"
    fi
    
    # Auto-detect Paperless URL from common locations
    if [[ -z "$PAPERLESS_URL" ]] || [[ "$PAPERLESS_URL" == "http://localhost:8000" ]]; then
        echo -e "${CYAN}   Auto-detecting Paperless-ngx instance...${NC}"
        
        # Check common ports and IPs
        local possible_urls=(
            "http://localhost:8000"
            "http://localhost:8010" 
            "http://192.168.178.10:8010"
            "http://127.0.0.1:8000"
            "http://127.0.0.1:8010"
        )
        
        for url in "${possible_urls[@]}"; do
            if curl -s --connect-timeout 2 "$url/api/" > /dev/null 2>&1; then
                PAPERLESS_URL="$url"
                echo -e "${GREEN}   ✅ Found Paperless-ngx at: $url${NC}"
                break
            fi
        done
    fi
    
    # Check if port is available for HTTP transport
    if [[ "$MCP_TRANSPORT" == "http" ]]; then
        while netstat -an 2>/dev/null | grep -q ":$MCP_PORT "; do
            echo -e "${YELLOW}   Port $MCP_PORT is in use, trying $((MCP_PORT + 1))${NC}"
            MCP_PORT=$((MCP_PORT + 1))
        done
        echo -e "${CYAN}   Using available port: $MCP_PORT${NC}"
    fi
}

auto_load_config

# Set defaults after config loading
PAPERLESS_URL=${PAPERLESS_URL:-"http://localhost:8000"}
PAPERLESS_TOKEN=${PAPERLESS_TOKEN:-""}
MCP_TRANSPORT=${MCP_TRANSPORT:-"stdio"}
MCP_PORT=${MCP_PORT:-"3000"}
CLOUDFLARE_TUNNEL_NAME=${CLOUDFLARE_TUNNEL_NAME:-"paperless-mcp"}
USE_CLOUDFLARE_TUNNEL=${USE_CLOUDFLARE_TUNNEL:-"false"}

# Run smart detection
smart_config_detection

# Smart prerequisites check
check_prerequisites() {
    echo -e "${BLUE}🔧 Checking prerequisites...${NC}"
    local issues_found=false
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        echo -e "${CYAN}   Install with: brew install node${NC}"
        issues_found=true
    else
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        if [[ $major_version -lt 18 ]]; then
            echo -e "${YELLOW}⚠️  Node.js version $node_version found, but v18+ recommended${NC}"
        else
            echo -e "${GREEN}✅ Node.js $node_version${NC}"
        fi
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        issues_found=true
    else
        echo -e "${GREEN}✅ npm $(npm --version)${NC}"
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        echo -e "${RED}❌ package.json not found - are you in the project directory?${NC}"
        issues_found=true
    else
        echo -e "${GREEN}✅ Project directory confirmed${NC}"
    fi
    
    # Check dependencies
    if [[ ! -d "node_modules" ]]; then
        echo -e "${YELLOW}⚠️  Dependencies not installed, installing...${NC}"
        npm install
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    else
        echo -e "${GREEN}✅ Dependencies found${NC}"
    fi
    
    # Check build
    if [[ ! -d "dist" ]] || [[ ! -f "dist/index.js" ]]; then
        echo -e "${YELLOW}⚠️  Project not built, building...${NC}"
        npm run build
        echo -e "${GREEN}✅ Project built${NC}"
    else
        # Check if source is newer than build
        if [[ "src/" -nt "dist/" ]]; then
            echo -e "${YELLOW}⚠️  Source code is newer than build, rebuilding...${NC}"
            npm run build
            echo -e "${GREEN}✅ Project rebuilt${NC}"
        else
            echo -e "${GREEN}✅ Project is up to date${NC}"
        fi
    fi
    
    if [[ "$issues_found" == true ]]; then
        echo -e "${RED}❌ Please fix the issues above and try again${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
    echo ""
}

# Smart Paperless connection test
test_paperless_connection() {
    echo -e "${BLUE}🔍 Testing Paperless-ngx connection...${NC}"
    
    if [[ -z "$PAPERLESS_TOKEN" ]]; then
        echo -e "${YELLOW}⚠️  No Paperless token configured${NC}"
        echo -e "${CYAN}   Server will start but API calls will fail${NC}"
        echo -e "${CYAN}   Please set PAPERLESS_TOKEN in config.sh${NC}"
        return 0
    fi
    
    # Test API connection
    local api_test=$(curl -s --connect-timeout 5 \
        -H "Authorization: Token $PAPERLESS_TOKEN" \
        "$PAPERLESS_URL/api/" 2>/dev/null || echo "FAILED")
    
    if [[ "$api_test" == "FAILED" ]] || [[ -z "$api_test" ]]; then
        echo -e "${YELLOW}⚠️  Cannot connect to Paperless-ngx at $PAPERLESS_URL${NC}"
        echo -e "${CYAN}   This might be normal if Paperless-ngx is not running yet${NC}"
        echo -e "${CYAN}   The MCP server will start anyway and retry connections as needed${NC}"
        echo -e "${CYAN}   Current URL: $PAPERLESS_URL${NC}"
        return 0
    else
        echo -e "${GREEN}✅ Paperless-ngx connection successful${NC}"
        
        # Get Paperless version if possible
        local version_info=$(echo "$api_test" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [[ "$version_info" != "unknown" ]]; then
            echo -e "${CYAN}   Paperless-ngx version: $version_info${NC}"
        fi
    fi
    
    return 0
}

# Cloudflare Tunnel function for ephemeral tunnels
start_cloudflare_tunnel() {
    log_header "Starting Cloudflare Tunnel"
    
    # Check if tunnel is already running and get existing URL
    EXISTING_TUNNEL_PID=$(pgrep -f "cloudflared tunnel" || true)
    TUNNEL_URL=""
    
    # If a tunnel process is running, try to reuse it
    if [ ! -z "$EXISTING_TUNNEL_PID" ]; then
        log_info "Found existing tunnel process (PID: $EXISTING_TUNNEL_PID)"
        
        # Try to get tunnel URL from log file
        if [ -f "cloudflared.log" ]; then
            TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' cloudflared.log | tail -1)
        fi
        
        # If we have a URL, verify the tunnel is still responding
        if [ ! -z "$TUNNEL_URL" ]; then
            log_info "Testing existing tunnel at: ${CYAN}$TUNNEL_URL${NC}"
            
            # Give tunnel a moment to be ready if it just started
            sleep 2
            
            # Simple connectivity test without requiring the MCP server
            if curl -s --max-time 5 --head "$TUNNEL_URL" >/dev/null 2>&1; then
                log_success "Existing tunnel is working: ${CYAN}$TUNNEL_URL${NC}"
                TUNNEL_PID=$EXISTING_TUNNEL_PID
                echo ""
                log_info "Public URL: ${CYAN}$TUNNEL_URL${NC}"
                log_info "Once server starts, check:"
                log_info "  • Health: ${CYAN}$TUNNEL_URL/health${NC}"
                log_info "  • API Docs: ${CYAN}$TUNNEL_URL/docs${NC}"
                log_info "  • MCP Tools: ${CYAN}$TUNNEL_URL/mcp/tools${NC}"
                
                # Save tunnel URL
                echo "$TUNNEL_URL" > .tunnel_url
                return 0
            else
                log_warning "Existing tunnel not responding, will create new one"
                # Kill old tunnel
                kill $EXISTING_TUNNEL_PID 2>/dev/null || true
                sleep 2
            fi
        else
            log_info "Existing tunnel found but no URL yet, will reuse process"
            TUNNEL_PID=$EXISTING_TUNNEL_PID
            
            # Wait for URL to appear in log
            log_info "Waiting for tunnel URL from existing process..."
            for i in {1..30}; do
                if [ -f "cloudflared.log" ]; then
                    TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' cloudflared.log | tail -1)
                    if [ ! -z "$TUNNEL_URL" ]; then
                        log_success "Tunnel URL available: ${CYAN}$TUNNEL_URL${NC}"
                        echo ""
                        log_info "Public URL: ${CYAN}$TUNNEL_URL${NC}"
                        log_info "Once server starts, check:"
                        log_info "  • Health: ${CYAN}$TUNNEL_URL/health${NC}"
                        log_info "  • API Docs: ${CYAN}$TUNNEL_URL/docs${NC}"
                        log_info "  • MCP Tools: ${CYAN}$TUNNEL_URL/mcp/tools${NC}"
                        
                        # Save tunnel URL
                        echo "$TUNNEL_URL" > .tunnel_url
                        return 0
                    fi
                fi
                sleep 2
                echo -n "."
            done
            echo ""
            log_warning "Timeout waiting for URL from existing tunnel, will create new one"
            kill $EXISTING_TUNNEL_PID 2>/dev/null || true
            sleep 2
        fi
    fi
    
    log_info "Creating new cloudflare tunnel to http://localhost:$MCP_HTTP_PORT..."
    
    # Backup old log file if it exists
    if [ -f "cloudflared.log" ]; then
        mv cloudflared.log "cloudflared.log.backup.$(date +%s)"
    fi
    
    # Start new cloudflared tunnel in background
    cloudflared tunnel --url "http://localhost:$MCP_HTTP_PORT" --logfile cloudflared.log &
    TUNNEL_PID=$!
    
    log_success "New cloudflare tunnel started (PID: $TUNNEL_PID)"
    
    # Wait for tunnel URL to be available
    log_info "Waiting for new tunnel URL..."
    for i in {1..30}; do
        if [ -f "cloudflared.log" ]; then
            TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' cloudflared.log | tail -1)
            if [ ! -z "$TUNNEL_URL" ]; then
                log_success "New tunnel available at: ${CYAN}$TUNNEL_URL${NC}"
                echo ""
                log_info "The tunnel is ready, MCP server will start next"
                log_info "Public URL: ${CYAN}$TUNNEL_URL${NC}"
                log_info "Once server starts, check:"
                log_info "  • Health: ${CYAN}$TUNNEL_URL/health${NC}"
                log_info "  • API Docs: ${CYAN}$TUNNEL_URL/docs${NC}"
                log_info "  • MCP Tools: ${CYAN}$TUNNEL_URL/mcp/tools${NC}"
                
                # Save tunnel URL for future use
                echo "$TUNNEL_URL" > .tunnel_url
                return 0
            fi
        fi
        sleep 2
        echo -n "."
    done
    echo ""
    
    if [ -z "$TUNNEL_URL" ]; then
        log_warning "Tunnel started but URL not available yet"
        log_info "Check cloudflared.log for tunnel URL"
        log_info "You can still access the server locally at: http://localhost:$MCP_HTTP_PORT"
        return 0  # Don't fail the script if tunnel URL isn't available immediately
    fi
}

# Smart Cloudflare Tunnel management
smart_tunnel_management() {
    if [[ "$USE_CLOUDFLARE_TUNNEL" != "true" ]]; then
        return 0
    fi
    
    # Force HTTP transport for tunnels
    if [[ "$MCP_TRANSPORT" != "http" ]]; then
        echo -e "${CYAN}   Cloudflare Tunnel requires HTTP transport, switching...${NC}"
        MCP_TRANSPORT="http"
    fi
    
    # Check if cloudflared is installed
    if ! command -v cloudflared &> /dev/null; then
        echo -e "${YELLOW}⚠️  cloudflared not found, attempting to install...${NC}"
        if command -v brew &> /dev/null; then
            brew install cloudflared
            echo -e "${GREEN}✅ cloudflared installed${NC}"
        else
            echo -e "${RED}❌ Please install cloudflared manually${NC}"
            echo -e "${CYAN}   https://github.com/cloudflare/cloudflared/releases${NC}"
            return 1
        fi
    fi
    
    # Use MCP_PORT as MCP_HTTP_PORT for compatibility with tunnel function
    export MCP_HTTP_PORT=$MCP_PORT
    
    # Call the new ephemeral tunnel function
    start_cloudflare_tunnel
}

# Run all checks
check_prerequisites
test_paperless_connection
smart_tunnel_management

# Final configuration summary
echo -e "${BLUE}📋 Final Configuration Summary:${NC}"
echo "================================="
echo -e "${CYAN}   Paperless URL: ${GREEN}$PAPERLESS_URL${NC}"
echo -e "${CYAN}   Transport Mode: ${GREEN}$MCP_TRANSPORT${NC}"
if [[ "$MCP_TRANSPORT" == "http" ]]; then
    echo -e "${CYAN}   HTTP Port: ${GREEN}$MCP_PORT${NC}"
fi
echo -e "${CYAN}   API Token: ${GREEN}${PAPERLESS_TOKEN:+[CONFIGURED]}${PAPERLESS_TOKEN:-[NOT SET]}${NC}"
if [[ "$USE_CLOUDFLARE_TUNNEL" == "true" ]]; then
    echo -e "${CYAN}   Cloudflare Tunnel: ${GREEN}$CLOUDFLARE_TUNNEL_NAME${NC}"
fi
echo ""

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down Paperless MCP Server...${NC}"
    
    # Only stop tunnel if explicitly requested via environment variable
    if [[ "$STOP_TUNNEL_ON_EXIT" == "true" ]] && [[ -n "$TUNNEL_PID" ]]; then
        echo -e "${CYAN}   Stopping Cloudflare Tunnel (PID: $TUNNEL_PID)...${NC}"
        kill $TUNNEL_PID 2>/dev/null || true
    elif [[ -n "$TUNNEL_PID" ]]; then
        echo -e "${CYAN}   ℹ  Cloudflare Tunnel (PID: $TUNNEL_PID) keeps running${NC}"
        echo -e "${CYAN}   ℹ  Tunnel URL: ${GREEN}$(cat .tunnel_url 2>/dev/null || echo 'check cloudflared.log')${NC}"
        echo -e "${CYAN}   ℹ  To stop tunnel: ${GREEN}pkill -f 'cloudflared tunnel'${NC}"
    fi
    
    echo -e "${GREEN}✅ MCP Server stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# All checks passed, ready to start
echo -e "${GREEN}🎯 All systems ready! Starting Paperless MCP Server...${NC}"
echo ""

# Export environment variables
export PAPERLESS_URL
export PAPERLESS_TOKEN
export MCP_TRANSPORT
export MCP_PORT

# Start the server with appropriate mode
if [[ "$MCP_TRANSPORT" == "http" ]]; then
    echo -e "${BLUE}🌐 Starting HTTP server on port $MCP_PORT...${NC}"
    echo -e "${CYAN}   Health check: ${GREEN}http://localhost:$MCP_PORT/health${NC}"
    echo -e "${CYAN}   MCP endpoint: ${GREEN}http://localhost:$MCP_PORT/message${NC}"
    if [[ "$USE_CLOUDFLARE_TUNNEL" == "true" ]]; then
        echo -e "${CYAN}   Tunnel status: ${GREEN}Check ./tunnel.sh status${NC}"
        echo ""
        echo -e "${BLUE}ℹ️  Tunnel Persistence:${NC}"
        echo -e "${CYAN}   • Tunnel keeps running when server stops${NC}"
        echo -e "${CYAN}   • Server restarts will reuse existing tunnel${NC}"
        echo -e "${CYAN}   • To stop tunnel: ${GREEN}pkill -f 'cloudflared tunnel'${NC}"
        echo -e "${CYAN}   • To stop tunnel on exit: ${GREEN}STOP_TUNNEL_ON_EXIT=true ./start.sh${NC}"
    fi
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the MCP server${NC}"
    echo ""
    npm run start
else
    echo -e "${BLUE}📡 Starting STDIO server for MCP clients...${NC}"
    echo -e "${CYAN}   Ready for MCP client connections (e.g., Claude Desktop)${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
    echo ""
    npm run start
fi