# Paperless MCP Server

[![npm version](https://badge.fury.io/js/@mweinheimer%2Fpaperless-mcp-server.svg)](https://badge.fury.io/js/@mweinheimer%2Fpaperless-mcp-server)

A Model Context Protocol (MCP) server for integrating with Paperless-ngx document management system. This server enables AI assistants to search, retrieve, and manage documents stored in Paperless-ngx through a standardized interface.

## Features

### 🔧 Tools (41 total)

#### Documents (14 tools)
- **search_documents**: Search for documents with flexible filtering options
- **get_document**: Retrieve detailed information about specific documents
- **update_document**: Modify document metadata (title, tags, correspondent, etc.)
- **bulk_update_documents**: Update multiple documents at once (requires document IDs)
- **delete_document**: Delete a document from Paperless-ngx
- **download_document**: Get download URLs for documents
- **get_document_suggestions**: Get automatic suggestions for document metadata
- **get_document_metadata**: Get extracted metadata from document

#### Tags (6 tools)
- **list_tags**: Get all available tags
- **get_tag**: Get details of a specific tag
- **create_tag**: Create new tags with color
- **update_tag**: Update existing tag properties
- **delete_tag**: Delete a tag

#### Correspondents (6 tools)
- **list_correspondents**: Get all correspondents
- **get_correspondent**: Get details of a specific correspondent
- **create_correspondent**: Create new correspondents
- **update_correspondent**: Update existing correspondent
- **delete_correspondent**: Delete a correspondent

#### Document Types (6 tools)
- **list_document_types**: Get all document types
- **get_document_type**: Get details of a specific document type
- **create_document_type**: Create new document types
- **update_document_type**: Update existing document type
- **delete_document_type**: Delete a document type

#### Storage Paths (5 tools)
- **list_storage_paths**: List all storage paths
- **get_storage_path**: Get details of a specific storage path
- **create_storage_path**: Create new storage path
- **update_storage_path**: Update existing storage path
- **delete_storage_path**: Delete a storage path

#### Custom Fields (5 tools)
- **list_custom_fields**: List all custom fields
- **get_custom_field**: Get details of a specific custom field
- **create_custom_field**: Create new custom field (string, url, date, boolean, integer, float, monetary)
- **update_custom_field**: Update existing custom field
- **delete_custom_field**: Delete a custom field

#### Saved Views (5 tools)
- **list_saved_views**: List all saved views
- **get_saved_view**: Get details of a specific saved view
- **create_saved_view**: Create new saved view with filters
- **update_saved_view**: Update existing saved view
- **delete_saved_view**: Delete a saved view

#### System & Tasks (4 tools)
- **list_tasks**: List all tasks in Paperless-ngx
- **acknowledge_task**: Acknowledge a completed task
- **get_statistics**: Get Paperless-ngx statistics (doc counts, types, etc.)
- **get_logs**: Get Paperless-ngx system logs

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
npm install -g paperless-mcp-server
```

> **Migration Note**: The package was previously published as `@mweinheimer/paperless-mcp-server` but has been moved to the unscoped `paperless-mcp-server`. If you have the old version installed, please uninstall it first:
> ```bash
> npm uninstall -g @mweinheimer/paperless-mcp-server
> npm install -g paperless-mcp-server
> ```

### Install with npx (no global installation)

```bash
npx paperless-mcp-server
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
      "args": ["-y", "paperless-mcp-server"],
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
For HTTP-based integrations with ChatGPT and other HTTP clients using Streamable HTTP protocol:

```bash
# Clone the repository for development setup
git clone https://github.com/heimerle/paperless-mcp-server
cd paperless-mcp-server

# Install dependencies
npm install

# Configure your Paperless settings
cp config.example.sh config.sh
# Edit config.sh with your Paperless-ngx URL and API token

# Load config and start server
source config.sh
./start.sh
```

HTTP endpoints:
- `GET /health` - Health check
- `POST /api` - Modern Streamable HTTP with Mcp-Session-Id headers (for ChatGPT)
- Legacy endpoints: `GET /message`, `POST /message`, `/mcp` (SSE-based)

### With Other MCP Clients

The server can be used with any MCP-compatible client. Launch it with:

#### Using global installation:
```bash
PAPERLESS_URL=http://your-paperless-instance:8000 PAPERLESS_TOKEN=your_token paperless-mcp
```

#### Using npx:
```bash
PAPERLESS_URL=http://your-paperless-instance:8000 PAPERLESS_TOKEN=your_token npx paperless-mcp-server
```

## API Coverage

This MCP server provides comprehensive coverage of the Paperless-ngx API:

### Fully Implemented (41 MCP Tools)
- **Documents**: Full CRUD + search, content, metadata, suggestions, bulk operations
- **Tags**: Complete CRUD operations
- **Correspondents**: Complete CRUD operations  
- **Document Types**: Complete CRUD operations
- **Storage Paths**: Complete CRUD operations
- **Custom Fields**: Complete CRUD operations (all data types)
- **Saved Views**: Complete CRUD operations with filters
- **Tasks**: List and acknowledge tasks
- **System**: Statistics and logs

### Paperless-ngx API Endpoints Used
- `/api/documents/` - Document operations
- `/api/documents/{id}/` - Specific document access
- `/api/documents/{id}/content/` - Full text content
- `/api/documents/{id}/download/` - Original file download
- `/api/documents/{id}/suggestions/` - AI metadata suggestions
- `/api/documents/{id}/metadata/` - Extracted metadata
- `/api/tags/` - Tag management
- `/api/correspondents/` - Correspondent management
- `/api/document_types/` - Document type management
- `/api/storage_paths/` - Storage path configuration
- `/api/custom_fields/` - Custom field definitions
- `/api/saved_views/` - Saved view management
- `/api/tasks/` - Background task monitoring
- `/api/statistics/` - System statistics
- `/api/logs/` - System logs

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
npx @modelcontextprotocol/inspector npx paperless-mcp-server
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
   npm info paperless-mcp-server
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