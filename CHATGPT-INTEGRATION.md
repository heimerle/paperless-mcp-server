# ChatGPT Integration für Paperless MCP Server

## ✅ Problem behoben!

Der MCP Server unterstützt jetzt beide Endpunkte:
- `/message` (Standard MCP Endpunkt)
- `/mcp` (ChatGPT Konnektor Endpunkt)

## 🚀 Server starten

```bash
./start.sh
```

Der Server wird automatisch:
1. Einen Cloudflare Tunnel erstellen (oder bestehenden wiederverwenden)
2. Eine öffentliche URL generieren (z.B. `https://xxx.trycloudflare.com`)
3. Den MCP Server auf Port 3000 starten

## 🔗 Aktuelle Tunnel-URL

Die aktuelle URL findest du nach dem Start in der Ausgabe oder in der Datei:
```bash
cat .tunnel_url
```

## 📝 ChatGPT Konnektor einrichten

1. **Öffne ChatGPT** und gehe zu den Einstellungen
2. **Füge einen neuen Konnektor hinzu**
3. **Verwende die Tunnel-URL mit `/mcp` Endpunkt:**
   ```
   https://[deine-tunnel-url].trycloudflare.com/mcp
   ```

## 🔧 Verfügbare Endpunkte

- **Health Check:** `https://[tunnel-url]/health`
- **MCP Tools:** `https://[tunnel-url]/mcp/tools` 
- **API Docs:** `https://[tunnel-url]/docs`
- **MCP Endpoint (Standard):** `https://[tunnel-url]/message`
- **MCP Endpoint (ChatGPT):** `https://[tunnel-url]/mcp`

## ⚠️ Wichtige Hinweise

### Tunnel-Wiederverwendung & Persistenz
- **Tunnel läuft unabhängig vom MCP Server** (separater Prozess)
- **Bei Server-Neustart:** Tunnel wird automatisch wiederverwendet
- **Bei Server-Stop:** Tunnel läuft standardmäßig weiter
- **Vorteil:** Schnellere Server-Neustarts, stabile URL
- **Tunnel manuell stoppen:** `pkill -f 'cloudflared tunnel'`
- **Tunnel beim Server-Stop beenden:** `STOP_TUNNEL_ON_EXIT=true ./start.sh`

### Ephemeral Tunnels
- Die kostenlosen Cloudflare Tunnels haben keine Uptime-Garantie
- Für Production solltest du einen benannten Tunnel mit Cloudflare-Account verwenden
- Die URL ändert sich, wenn ein neuer Tunnel erstellt wird

### Fehler 530
Wenn ChatGPT einen **Fehler 530** meldet, bedeutet das:
- Der Tunnel läuft, aber der MCP Server ist nicht erreichbar
- **Lösung:** Stelle sicher, dass `./start.sh` läuft und der Server auf Port 3000 aktiv ist

## 🛠️ Troubleshooting

### Server läuft nicht
```bash
# Prüfe ob der Server auf Port 3000 läuft
lsof -i:3000

# Prüfe ob der Tunnel läuft
pgrep -fl "cloudflared tunnel"

# Prüfe die Logs
tail -f cloudflared.log
```

### Port bereits belegt
```bash
# Beende alle Prozesse auf Port 3000
lsof -ti:3000 | xargs kill -9
```

### Neuen Tunnel erzwingen
```bash
# Stoppe den alten Tunnel
pkill -f "cloudflared tunnel"

# Starte den Server neu
./start.sh
```

## 📊 Verfügbare MCP Tools

Der Paperless MCP Server bietet folgende Tools:

1. **search_documents** - Durchsuche Dokumente
2. **get_document** - Hole Dokumentdetails
3. **update_document** - Aktualisiere Dokument-Metadaten
4. **bulk_update_documents** - Massenaktualisierung von Dokumenten
5. **download_document** - Lade Dokument herunter
6. **list_tags** - Liste alle Tags
7. **create_tag** - Erstelle neuen Tag
8. **list_correspondents** - Liste alle Korrespondenten
9. **create_correspondent** - Erstelle neuen Korrespondent
10. **list_document_types** - Liste alle Dokumenttypen
11. **create_document_type** - Erstelle neuen Dokumenttyp

## 🔐 Konfiguration

Bearbeite `config.sh` um deine Paperless-ngx Instanz zu konfigurieren:

```bash
PAPERLESS_URL="http://192.168.178.10:8010"
PAPERLESS_TOKEN="dein-api-token"
MCP_TRANSPORT="http"
MCP_PORT="3000"
USE_CLOUDFLARE_TUNNEL="true"
```

## ✅ Status prüfen

```bash
# Aktuellen Status anzeigen
./tunnel.sh status

# Server läuft?
curl http://localhost:3000/health

# Öffentlich erreichbar?
curl https://[tunnel-url].trycloudflare.com/health
```

---

**Viel Erfolg mit deinem Paperless MCP Server! 🎉**
