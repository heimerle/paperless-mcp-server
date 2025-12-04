#!/bin/bash

# Paperless MCP Server - Docker Deployment Script for R730
# Deploys to documents.winehome.de

set -e

# Configuration
DOCKER_HOST="r730"  # SSH host name for your R730 server
DEPLOY_DIR="/opt/docker/paperless-mcp"
IMAGE_NAME="paperless-mcp-server"
IMAGE_TAG="latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying Paperless MCP Server to R730...${NC}"

# Step 1: Build locally
echo -e "${YELLOW}📦 Building Docker image locally...${NC}"
npm run build
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

# Step 2: Save and transfer image
echo -e "${YELLOW}📤 Transferring image to R730...${NC}"
docker save ${IMAGE_NAME}:${IMAGE_TAG} | ssh ${DOCKER_HOST} "docker load"

# Step 3: Create deployment directory on R730
echo -e "${YELLOW}📁 Setting up deployment directory...${NC}"
ssh ${DOCKER_HOST} "mkdir -p ${DEPLOY_DIR}"

# Step 4: Copy docker-compose.yml
echo -e "${YELLOW}📋 Copying configuration files...${NC}"
scp docker-compose.yml ${DOCKER_HOST}:${DEPLOY_DIR}/

# Step 5: Check if .env exists on server, if not prompt
ssh ${DOCKER_HOST} "test -f ${DEPLOY_DIR}/.env" || {
    echo -e "${YELLOW}⚠️  No .env file found on server.${NC}"
    echo -e "${YELLOW}   Please create ${DEPLOY_DIR}/.env with:${NC}"
    echo ""
    echo "   PAPERLESS_URL=http://192.168.178.10:8010"
    echo "   PAPERLESS_TOKEN=your-token-here"
    echo ""
    read -p "Press Enter when .env is configured, or Ctrl+C to abort..."
}

# Step 6: Deploy
echo -e "${YELLOW}🐳 Starting container...${NC}"
ssh ${DOCKER_HOST} "cd ${DEPLOY_DIR} && docker compose pull && docker compose up -d"

# Step 7: Check health
echo -e "${YELLOW}🏥 Waiting for health check...${NC}"
sleep 5
ssh ${DOCKER_HOST} "docker exec paperless-mcp wget -qO- http://localhost:3000/health" && {
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${GREEN}🌐 MCP Server is now available at:${NC}"
    echo -e "${BLUE}   https://documents.winehome.de${NC}"
    echo ""
    echo -e "${GREEN}📍 Endpoints:${NC}"
    echo "   Health:  https://documents.winehome.de/health"
    echo "   MCP API: https://documents.winehome.de/api"
} || {
    echo -e "${RED}❌ Health check failed. Check logs with:${NC}"
    echo "   ssh ${DOCKER_HOST} docker logs paperless-mcp"
}
