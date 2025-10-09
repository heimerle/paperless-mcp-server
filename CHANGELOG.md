# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2024-10-09

### Fixed
- Updated GitHub repository URLs to use correct username (heimerle)
- Fixed homepage, repository, and bugs URLs in package.json

## [1.1.0] - 2024-10-09

### Added
- HTTP transport support with Server-Sent Events (SSE)
- Configurable transport mode via `MCP_TRANSPORT` environment variable
- HTTP server with health check endpoint (`/health`)
- CORS support for cross-origin requests
- New npm scripts: `start:http` and `dev:http`
- Comprehensive HTTP transport documentation

### Changed
- Server now supports both STDIO (default) and HTTP transports
- Added Express.js and CORS dependencies for HTTP support

## [1.0.0] - 2024-10-09

### Added
- Initial release of Paperless MCP Server
- Document search functionality with flexible filtering
- Individual and bulk document updates
- Tag, correspondent, and document type management
- Document content access as MCP resources
- Download URL generation for documents
- Comprehensive error handling and validation
- TypeScript implementation with full type safety
- npm package distribution with global CLI command

### Features
- **Tools**: 11 MCP tools covering all major Paperless-ngx operations
- **Resources**: Document content access for AI context
- **API Coverage**: Complete integration with Paperless-ngx REST API
- **Bulk Operations**: Efficient batch document updates
- **Error Handling**: Detailed error reporting and validation

### Dependencies
- npm notice name: @mweinheimer/paperless-mcp-server
- zod: ^3.23.8
- axios: ^1.7.7

### Requirements
- Node.js 18 or higher
- Paperless-ngx instance with API access
- Valid API token