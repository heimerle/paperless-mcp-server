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
    if [[ -z "$MCP_TRANSPORT" ]]; then
        # Auto-detect if we should use HTTP transport based on environment
        if [[ -n "$SSH_CLIENT" ]] || [[ -n "$SSH_TTY" ]]; then
            MCP_TRANSPORT="http"
            echo -e "${CYAN}   Detected remote environment → HTTP transport${NC}"
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
        
        # Check common ports and IPs (preferred URL first)
        local possible_urls=(
            "http://192.168.178.10:8010"
            "http://localhost:8010" 
            "http://localhost:8000"
            "http://127.0.0.1:8010"
            "http://127.0.0.1:8000"
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
PAPERLESS_URL=${PAPERLESS_URL:-"http://192.168.178.10:8010"}
PAPERLESS_TOKEN=${PAPERLESS_TOKEN:-""}
MCP_TRANSPORT=${MCP_TRANSPORT:-"stdio"}
MCP_PORT=${MCP_PORT:-"3000"}

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

# Run all checks
check_prerequisites
test_paperless_connection

# Final configuration summary
echo -e "${BLUE}📋 Final Configuration Summary:${NC}"
echo "================================="
echo -e "${CYAN}   Paperless URL: ${GREEN}$PAPERLESS_URL${NC}"
echo -e "${CYAN}   Transport Mode: ${GREEN}$MCP_TRANSPORT${NC}"
if [[ "$MCP_TRANSPORT" == "http" ]]; then
    echo -e "${CYAN}   HTTP Port: ${GREEN}$MCP_PORT${NC}"
fi
echo -e "${CYAN}   API Token: ${GREEN}${PAPERLESS_TOKEN:+[CONFIGURED]}${PAPERLESS_TOKEN:-[NOT SET]}${NC}"
echo ""

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down Paperless MCP Server...${NC}"
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
    echo -e "${CYAN}   MCP endpoint: ${GREEN}http://localhost:$MCP_PORT/api${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the MCP server${NC}"
    echo ""
    npm run start
elif [[ "$MCP_TRANSPORT" == "stdio" ]]; then
    echo -e "${BLUE}📡 Starting STDIO server for MCP clients...${NC}"
    echo -e "${CYAN}   Ready for MCP client connections (e.g., Claude Desktop)${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
    echo ""
    npm run start
elif [[ "$MCP_TRANSPORT" == "both" ]]; then
    echo -e "${BLUE}🌐 Starting HTTP server on port $MCP_PORT...${NC}"
    echo -e "${CYAN}   Health check: ${GREEN}http://localhost:$MCP_PORT/health${NC}"
    echo -e "${CYAN}   MCP endpoint: ${GREEN}http://localhost:$MCP_PORT/api${NC}"
    echo -e "${BLUE}📡 Also starting STDIO server for MCP clients...${NC}"
    echo -e "${CYAN}   Ready for MCP client connections (e.g., Claude Desktop)${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the servers${NC}"
    echo ""
    npm run start
else
    echo -e "${RED}❌ Unknown MCP_TRANSPORT: $MCP_TRANSPORT${NC}"
    exit 1
fi