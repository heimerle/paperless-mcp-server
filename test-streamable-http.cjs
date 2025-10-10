#!/usr/bin/env node

/**
 * Test-Client für MCP Streamable HTTP (Modern Protocol)
 * Implementiert: https://modelcontextprotocol.io/docs/concepts/transports
 */

const https = require('https');
const http = require('http');

const TUNNEL_URL = process.env.TUNNEL_URL || 'https://markers-rouge-strike-conversation.trycloudflare.com';
const MCP_ENDPOINT = '/api';

console.log('🧪 MCP Streamable HTTP Test');
console.log('============================');
console.log(`Endpoint: ${TUNNEL_URL}${MCP_ENDPOINT}\n`);

let sessionId = null;

// Schritt 1: Initialize Request
console.log('📤 Schritt 1: Initialize Request (POST)...');

const url = new URL(TUNNEL_URL + MCP_ENDPOINT);
const protocol = url.protocol === 'https:' ? https : http;

const initData = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
      resources: {}
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
});

const initReq = protocol.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(initData),
    'MCP-Protocol-Version': '2024-11-05',
    'Accept': 'application/json, text/event-stream'
  }
}, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`📋 Response Headers:`);
  Object.keys(res.headers).forEach(key => {
    console.log(`   ${key}: ${res.headers[key]}`);
  });
  
  // Extract Mcp-Session-Id from headers
  sessionId = res.headers['mcp-session-id'];
  if (sessionId) {
    console.log(`\n🎫 Session ID empfangen: ${sessionId}`);
  } else {
    console.log(`\n⚠️  Kein Mcp-Session-Id Header!`);
  }
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log(`\n📦 Initialize Response:`);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (sessionId) {
        // Schritt 2: Tools auflisten
        setTimeout(() => listTools(), 1000);
      } else {
        console.log('\n❌ Kann nicht fortfahren ohne Session ID');
        process.exit(1);
      }
    } catch (e) {
      console.log(`⚠️  Parse Error:`, e.message);
      console.log(`📄 Raw Response:`, responseData);
      process.exit(1);
    }
  });
});

initReq.on('error', (error) => {
  console.error('❌ Initialize Request Fehler:', error.message);
  process.exit(1);
});

initReq.write(initData);
initReq.end();

// Schritt 2: Tools auflisten
function listTools() {
  console.log('\n📤 Schritt 2: Tools/List Request (POST mit Session-ID)...');
  
  const toolsData = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });
  
  const toolsReq = protocol.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(toolsData),
      'MCP-Protocol-Version': '2024-11-05',
      'Mcp-Session-Id': sessionId,  // ← Session ID im Header!
      'Accept': 'application/json, text/event-stream'
    }
  }, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        console.log(`\n🛠️  Verfügbare Tools (${parsed.result?.tools?.length || 0}):`);
        if (parsed.result && parsed.result.tools) {
          parsed.result.tools.forEach((tool, i) => {
            console.log(`   ${i + 1}. ${tool.name}`);
            console.log(`      ${tool.description}`);
          });
        }
        
        // Schritt 3: Ein Tool aufrufen
        if (parsed.result?.tools?.length > 0) {
          setTimeout(() => callTool('search_documents'), 1000);
        } else {
          console.log('\n✅ Test erfolgreich! (Keine Tools zum Testen)');
          setTimeout(() => cleanup(), 500);
        }
      } catch (e) {
        console.log(`⚠️  Parse Error:`, e.message);
        console.log(`📄 Raw Response:`, responseData);
        setTimeout(() => cleanup(), 500);
      }
    });
  });
  
  toolsReq.on('error', (error) => {
    console.error('❌ Tools Request Fehler:', error.message);
    setTimeout(() => cleanup(), 500);
  });
  
  toolsReq.write(toolsData);
  toolsReq.end();
}

// Schritt 3: Tool aufrufen
function callTool(toolName) {
  console.log(`\n📤 Schritt 3: Tool "${toolName}" aufrufen...`);
  
  const callData = JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: {
        query: 'test'
      }
    }
  });
  
  const callReq = protocol.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(callData),
      'MCP-Protocol-Version': '2024-11-05',
      'Mcp-Session-Id': sessionId,
      'Accept': 'application/json, text/event-stream'
    }
  }, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        if (parsed.result) {
          console.log(`\n✅ Tool-Aufruf erfolgreich!`);
          console.log(`📦 Result:`, JSON.stringify(parsed.result, null, 2).substring(0, 500));
        } else if (parsed.error) {
          console.log(`\n⚠️  Tool-Fehler:`, parsed.error.message);
        }
      } catch (e) {
        console.log(`⚠️  Parse Error:`, e.message);
        console.log(`📄 Raw Response (first 200 chars):`, responseData.substring(0, 200));
      }
      
      console.log('\n✅ Alle Tests abgeschlossen!');
      setTimeout(() => cleanup(), 500);
    });
  });
  
  callReq.on('error', (error) => {
    console.error('❌ Tool Call Fehler:', error.message);
    setTimeout(() => cleanup(), 500);
  });
  
  callReq.write(callData);
  callReq.end();
}

// Cleanup: Session löschen
function cleanup() {
  if (!sessionId) {
    process.exit(0);
    return;
  }
  
  console.log(`\n🗑️  Session aufräumen: DELETE mit Session-ID...`);
  
  const deleteReq = protocol.request(url, {
    method: 'DELETE',
    headers: {
      'Mcp-Session-Id': sessionId
    }
  }, (res) => {
    console.log(`✅ DELETE Status: ${res.statusCode}`);
    console.log('👋 Test beendet');
    process.exit(0);
  });
  
  deleteReq.on('error', (error) => {
    console.error('⚠️  DELETE Fehler:', error.message);
    process.exit(1);
  });
  
  deleteReq.end();
}

// Timeout nach 30 Sekunden
setTimeout(() => {
  console.log('\n⏰ Timeout - Test abgebrochen');
  process.exit(1);
}, 30000);
