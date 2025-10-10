#!/bin/bash

# Ultra-Simple Start Script for Paperless MCP Server
# Just run ./run.sh and everything will be handled automatically!

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🚀 Paperless MCP Server - One-Click Start${NC}"
echo "==========================================="
echo ""

# Check if config exists, create if not
if [[ ! -f "config.sh" ]]; then
    echo -e "${YELLOW}⚠️  First time setup - creating configuration...${NC}"
    
    if [[ -f "config.example.sh" ]]; then
        cp config.example.sh config.sh
        echo -e "${GREEN}✅ Created config.sh from template${NC}"
        
        # Try to auto-detect some settings
        echo -e "${CYAN}🔍 Auto-detecting settings...${NC}"
        
        # Try to find Paperless instance
        local found_paperless=""
        local test_urls=(
            "http://localhost:8000"
            "http://localhost:8010"
            "http://192.168.178.10:8010"
            "http://127.0.0.1:8000"
        )
        
        for url in "${test_urls[@]}"; do
            if curl -s --connect-timeout 2 "$url/api/" > /dev/null 2>&1; then
                found_paperless="$url"
                echo -e "${GREEN}   ✅ Found Paperless-ngx at: $url${NC}"
                # Update config with found URL
                sed -i.bak "s|export PAPERLESS_URL=.*|export PAPERLESS_URL=\"$url\"|" config.sh
                break
            fi
        done
        
        if [[ -z "$found_paperless" ]]; then
            echo -e "${YELLOW}   ⚠️  No Paperless-ngx instance found automatically${NC}"
            echo -e "${CYAN}   Please edit config.sh with your Paperless-ngx URL and token${NC}"
        fi
        
        # Set HTTP transport as default for easier testing
        sed -i.bak 's|export MCP_TRANSPORT=.*|export MCP_TRANSPORT="http"|' config.sh
        
        echo ""
        echo -e "${CYAN}📝 Configuration created at: config.sh${NC}"
        
        if [[ -n "$found_paperless" ]]; then
            echo -e "${YELLOW}⚠️  Please add your Paperless-ngx API token to config.sh:${NC}"
            echo -e "${CYAN}   1. Open config.sh in a text editor${NC}"
            echo -e "${CYAN}   2. Replace 'your-paperless-api-token-here' with your actual token${NC}"
            echo -e "${CYAN}   3. Run ./run.sh again${NC}"
            echo ""
            echo -e "${BLUE}💡 Get your API token from: $found_paperless/admin/auth_token/token/${NC}"
            exit 0
        else
            echo -e "${CYAN}   Please edit config.sh with your settings and run ./run.sh again${NC}"
            exit 0
        fi
    else
        echo -e "${RED}❌ No config template found${NC}"
        exit 1
    fi
fi

# All set, use the smart start script
echo -e "${GREEN}✅ Configuration found, starting server...${NC}"
echo ""
exec ./start.sh