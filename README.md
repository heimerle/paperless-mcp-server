# Paperless MCP Server

[![npm version](https://badge.fury.io/js/@mweinheimer%2Fpaperless-mcp-server.svg)](https://badge.fury.io/js/@mweinheimer%2Fpaperless-mcp-server)

A Model Context Protocol (MCP) server for integrating with Paperless-ngx document management system. This server enables AI assistants to search, retrieve, and manage documents stored in Paperless-ngx through a standardized interface.

## Features

### 🔧 Tools
- **search_documents**: Search for documents with flexible filtering options
- **get_document**: Retrieve detailed information about specific documents
- **update_document**: Modify document metadata (title, tags, correspondent, etc.)
- **bulk_update_documents**: Update multiple documents at once (requires document IDs)
- **list_tags**: Get all available tags
- **list_correspondents**: Get all correspondents
- **list_document_types**: Get all document types
- **create_tag**: Create new tags
- **create_correspondent**: Create new correspondents
- **create_document_type**: Create new document types
- **download_document**: Get download URLs for documents

### 📄 Resources
- **Document Content**: Access full document content as resources for AI context
- **Document Metadata**: Structured access to document information

## Installation

### Prerequisites
- Node.js 18 or higher
- A running Paperless-ngx instance
- API token for your Paperless-ngx instance

### Install from npm

```bash
npm install -g @mweinheimer/paperless-mcp-server
```

### Install with npx (no global installation)

```bash
npx @mweinheimer/paperless-mcp-server
```

## Configuration

Set the following environment variables:

- `PAPERLESS_URL`: URL of your Paperless-ngx instance (default: `http://localhost:8000`)
- `PAPERLESS_TOKEN`: Your Paperless-ngx API token (required)

### Getting Your API Token

1. Log into your Paperless-ngx web interface
2. Go to Settings → API Tokens
3. Create a new token or copy an existing one

## Usage

### With Claude Desktop

Add the following to your Claude Desktop configuration file (`claude_desktop_config.json`):

#### Using global installation:
```json
{
  "mcpServers": {
    "paperless": {
      "command": "paperless-mcp",
      "env": {
        "PAPERLESS_URL": "http://your-paperless-instance:8000",
        "PAPERLESS_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

#### Using npx (recommended):
```json
{
  "mcpServers": {
    "paperless": {
      "command": "npx",
      "args": ["-y", "@mweinheimer/paperless-mcp-server"],
      "env": {
        "PAPERLESS_URL": "http://your-paperless-instance:8000",
        "PAPERLESS_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

### Transport Options

The server supports two transport protocols:

#### STDIO Transport (Default)
For MCP clients like Claude Desktop that use stdin/stdout communication:

```bash
# Environment variables
export PAPERLESS_URL="http://your-paperless-instance:8000"
export PAPERLESS_TOKEN="your_api_token_here"

# Run with STDIO (default)
paperless-mcp
```

#### HTTP Transport
For HTTP-based integrations with Server-Sent Events (SSE):

```bash
# Using environment variables
export MCP_TRANSPORT="http"
export MCP_PORT="3000"
export PAPERLESS_URL="http://your-paperless-instance:8000"
export PAPERLESS_TOKEN="your_api_token_here"
paperless-mcp

# Or using npm scripts
npm run start:http        # Production
npm run dev:http          # Development

# Or inline
MCP_TRANSPORT=http MCP_PORT=3000 paperless-mcp
```

HTTP endpoints:
- `GET /health` - Health check
- `GET /message` - SSE connection for receiving messages  
- `POST /message?sessionId=<id>` - Send messages to server

### With Other MCP Clients

The server can be used with any MCP-compatible client. Launch it with:

#### Using global installation:
```bash
PAPERLESS_URL=http://your-paperless-instance:8000 PAPERLESS_TOKEN=your_token paperless-mcp
```

#### Using npx:
```bash
PAPERLESS_URL=http://your-paperless-instance:8000 PAPERLESS_TOKEN=your_token npx @mweinheimer/paperless-mcp-server
```

## API Coverage

This MCP server covers the following Paperless-ngx API endpoints:

- `/api/documents/` - Document search and listing
- `/api/documents/{id}/` - Document retrieval and updates
- `/api/documents/{id}/content/` - Document content access
- `/api/documents/{id}/download/` - Document download URLs
- `/api/tags/` - Tag management
- `/api/correspondents/` - Correspondent management
- `/api/document_types/` - Document type management

## Example Interactions

### Search for Documents
```
"Find all documents from John Doe about invoices"
```

### Get Document Details
```
"Show me the details of document 123"
```

### Update Document Metadata
```
"Tag document 456 with 'important' and 'financial'"
```

### Create New Tags
```
"Create a new tag called 'urgent' with red color"
```

### Bulk Update Documents
```
"Update documents 123, 456, and 789 to add the 'processed' tag and set correspondent to 'John Doe'"
```

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing with MCP Inspector
```bash
# With global installation
npx @modelcontextprotocol/inspector paperless-mcp

# With npx
npx @modelcontextprotocol/inspector npx @mweinheimer/paperless-mcp-server
```

## Security Considerations

- Keep your API token secure and never commit it to version control
- Use environment variables or secure configuration management
- Ensure your Paperless-ngx instance is properly secured
- Consider network security when exposing Paperless-ngx API

## Troubleshooting

### Common Issues

1. **Authentication Error**: Verify your API token is correct and has necessary permissions
2. **Connection Error**: Check that `PAPERLESS_URL` is accessible from where the MCP server runs
3. **Missing Documents**: Ensure the user associated with the API token has access to the documents

### Logging

The server logs errors to stderr. Check these logs when troubleshooting issues.

## Publishing to npm

This package is configured for easy publishing to npm. To publish a new version:

### Prerequisites
- npm account with publishing rights
- Logged in to npm (`npm login`)

### Publishing Steps

1. **Update version** (choose one):
   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   npm version minor  # 1.0.0 -> 1.1.0
   npm version major  # 1.0.0 -> 2.0.0
   ```

2. **Publish to npm**:
   ```bash
   npm publish
   ```

3. **Verify publication**:
   ```bash
   npm info @mweinheimer/paperless-mcp-server
   ```

The package includes:
- Automatic build on `prepublishOnly`
- Proper file filtering via `.npmignore`
- Executable binary (`paperless-mcp`)
- TypeScript declarations
- Public access configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Links

- [Paperless-ngx](https://docs.paperless-ngx.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Paperless-ngx API Documentation](https://docs.paperless-ngx.com/api/)