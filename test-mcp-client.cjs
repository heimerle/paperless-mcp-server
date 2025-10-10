#!/usr/bin/env node

/**
 * Test-Client für MCP SSE-Verbindung
 * Simuliert wie ChatGPT mit dem MCP-Server kommunizieren sollte
 */

const https = require('https');
const http = require('http');

const TUNNEL_URL = process.env.TUNNEL_URL || 'https://auctions-office-donald-treo.trycloudflare.com';
const MCP_ENDPOINT = '/mcp';

console.log('🧪 MCP Client Test');
console.log('==================');
console.log(`Verbinde zu: ${TUNNEL_URL}${MCP_ENDPOINT}\n`);

// Schritt 1: GET-Request für SSE-Verbindung
console.log('📡 Schritt 1: SSE-Verbindung aufbauen (GET)...');

const url = new URL(TUNNEL_URL + MCP_ENDPOINT);
const protocol = url.protocol === 'https:' ? https : http;

const getReq = protocol.request(url, {
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
}, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`📋 Headers:`);
  Object.keys(res.headers).forEach(key => {
    console.log(`   ${key}: ${res.headers[key]}`);
  });
  
  if (res.statusCode !== 200) {
    console.error('❌ Fehler: Erwarteter Status 200');
    process.exit(1);
  }

  let sessionId = null;
  let buffer = '';

  res.setEncoding('utf8');
  
  res.on('data', (chunk) => {
    buffer += chunk;
    
    // SSE-Events parsen
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Letzte unvollständige Zeile behalten
    
    lines.forEach(line => {
      if (line.startsWith('event:')) {
        const eventType = line.substring(6).trim();
        console.log(`\n📨 Event: ${eventType}`);
      } else if (line.startsWith('data:')) {
        const data = line.substring(5).trim();
        try {
          const parsed = JSON.parse(data);
          console.log(`📦 Data:`, JSON.stringify(parsed, null, 2));
          
          // Extrahiere sessionId falls vorhanden
          if (!sessionId && parsed.sessionId) {
            sessionId = parsed.sessionId;
            console.log(`\n🎫 Session ID erhalten: ${sessionId}`);
            
            // Schritt 2: Sende initialize-Request
            setTimeout(() => sendInitialize(sessionId), 1000);
          }
        } catch (e) {
          console.log(`📄 Raw Data: ${data}`);
        }
      }
    });
  });
  
  res.on('end', () => {
    console.log('\n🔚 SSE-Verbindung beendet');
  });
});

getReq.on('error', (error) => {
  console.error('❌ GET-Request Fehler:', error.message);
  process.exit(1);
});

getReq.end();

// Schritt 2: POST-Request mit initialize
function sendInitialize(sessionId) {
  console.log('\n📤 Schritt 2: Initialize-Request senden (POST)...');
  
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  });
  
  const postUrl = new URL(`${TUNNEL_URL}${MCP_ENDPOINT}?sessionId=${sessionId}`);
  
  const postReq = protocol.request(postUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    console.log(`✅ POST Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log(`📦 Response:`, responseData);
      try {
        const parsed = JSON.parse(responseData);
        console.log(`✅ Parsed:`, JSON.stringify(parsed, null, 2));
        
        // Schritt 3: Liste Tools ab
        setTimeout(() => listTools(sessionId), 1000);
      } catch (e) {
        console.log(`⚠️  Konnte Response nicht parsen:`, e.message);
      }
    });
  });
  
  postReq.on('error', (error) => {
    console.error('❌ POST-Request Fehler:', error.message);
  });
  
  postReq.write(postData);
  postReq.end();
}

// Schritt 3: Liste verfügbare Tools
function listTools(sessionId) {
  console.log('\n📤 Schritt 3: Tools auflisten (POST)...');
  
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });
  
  const postUrl = new URL(`${TUNNEL_URL}${MCP_ENDPOINT}?sessionId=${sessionId}`);
  
  const postReq = protocol.request(postUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    console.log(`✅ POST Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        console.log(`\n🛠️  Verfügbare Tools:`);
        if (parsed.result && parsed.result.tools) {
          parsed.result.tools.forEach((tool, i) => {
            console.log(`   ${i + 1}. ${tool.name} - ${tool.description}`);
          });
        } else {
          console.log(`📦 Full Response:`, JSON.stringify(parsed, null, 2));
        }
        
        console.log('\n✅ Test erfolgreich abgeschlossen!');
        setTimeout(() => process.exit(0), 1000);
      } catch (e) {
        console.log(`⚠️  Konnte Response nicht parsen:`, e.message);
        console.log(`📄 Raw:`, responseData);
        setTimeout(() => process.exit(1), 1000);
      }
    });
  });
  
  postReq.on('error', (error) => {
    console.error('❌ POST-Request Fehler:', error.message);
  });
  
  postReq.write(postData);
  postReq.end();
}

// Timeout nach 30 Sekunden
setTimeout(() => {
  console.log('\n⏰ Timeout - Test abgebrochen');
  process.exit(1);
}, 30000);
