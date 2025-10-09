#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PaperlessClient, PaperlessDocument, BulkUpdateDocumentItem } from "./paperless-client.js";

// Environment configuration
const PAPERLESS_URL = process.env.PAPERLESS_URL || "http://localhost:8000";
const PAPERLESS_TOKEN = process.env.PAPERLESS_TOKEN;
const MCP_TRANSPORT = process.env.MCP_TRANSPORT || "stdio"; // "stdio" or "http"
const MCP_PORT = parseInt(process.env.MCP_PORT || "3000");

if (!PAPERLESS_TOKEN) {
  console.error("Error: PAPERLESS_TOKEN environment variable is required");
  process.exit(1);
}

// Initialize Paperless client
const paperlessClient = new PaperlessClient(PAPERLESS_URL, PAPERLESS_TOKEN);

// Create MCP server
const server = new Server(
  {
    name: "paperless-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool schemas
const SearchDocumentsSchema = z.object({
  query: z.string().optional().describe("Search query for documents"),
  limit: z.number().optional().default(10).describe("Maximum number of results to return"),
  ordering: z.enum(["created", "-created", "modified", "-modified", "title", "-title"]).optional().default("-created").describe("Sort order for results"),
  document_type: z.number().optional().describe("Filter by document type ID"),
  correspondent: z.number().optional().describe("Filter by correspondent ID"),
  tags: z.array(z.number()).optional().describe("Filter by tag IDs"),
});

const GetDocumentSchema = z.object({
  document_id: z.number().describe("ID of the document to retrieve"),
});

const UpdateDocumentSchema = z.object({
  document_id: z.number().describe("ID of the document to update"),
  title: z.string().optional().describe("New document title"),
  correspondent: z.number().optional().describe("Correspondent ID"),
  document_type: z.number().optional().describe("Document type ID"),
  tags: z.array(z.number()).optional().describe("Array of tag IDs to assign"),
  archive_serial_number: z.string().optional().describe("Archive serial number"),
});

const CreateTagSchema = z.object({
  name: z.string().describe("Name of the new tag"),
  color: z.string().optional().describe("Color code for the tag (hex format)"),
  text_color: z.string().optional().describe("Text color for the tag (hex format)"),
});

const CreateCorrespondentSchema = z.object({
  name: z.string().describe("Name of the new correspondent"),
});

const CreateDocumentTypeSchema = z.object({
  name: z.string().describe("Name of the new document type"),
});

const BulkUpdateDocumentsSchema = z.object({
  documents: z.array(z.object({
    id: z.number().describe("Document ID to update"),
    title: z.string().optional().describe("New document title"),
    correspondent: z.number().optional().describe("Correspondent ID"),
    document_type: z.number().optional().describe("Document type ID"),
    tags: z.array(z.number()).optional().describe("Array of tag IDs to assign"),
    archive_serial_number: z.string().optional().describe("Archive serial number"),
  })).describe("Array of documents to update with their IDs and new values"),
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_documents",
        description: "Search for documents in Paperless-ngx with optional filters",
        inputSchema: SearchDocumentsSchema,
      },
      {
        name: "get_document",
        description: "Retrieve detailed information about a specific document",
        inputSchema: GetDocumentSchema,
      },
      {
        name: "update_document",
        description: "Update document metadata (title, tags, correspondent, etc.)",
        inputSchema: UpdateDocumentSchema,
      },
      {
        name: "list_tags",
        description: "List all available tags in Paperless-ngx",
        inputSchema: z.object({}),
      },
      {
        name: "list_correspondents",
        description: "List all correspondents in Paperless-ngx",
        inputSchema: z.object({}),
      },
      {
        name: "list_document_types",
        description: "List all document types in Paperless-ngx",
        inputSchema: z.object({}),
      },
      {
        name: "create_tag",
        description: "Create a new tag in Paperless-ngx",
        inputSchema: CreateTagSchema,
      },
      {
        name: "create_correspondent",
        description: "Create a new correspondent in Paperless-ngx",
        inputSchema: CreateCorrespondentSchema,
      },
      {
        name: "create_document_type",
        description: "Create a new document type in Paperless-ngx",
        inputSchema: CreateDocumentTypeSchema,
      },
      {
        name: "download_document",
        description: "Get download URL for a document's original file",
        inputSchema: GetDocumentSchema,
      },
      {
        name: "bulk_update_documents",
        description: "Update multiple documents at once with new metadata (requires document IDs)",
        inputSchema: BulkUpdateDocumentsSchema,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_documents": {
        const parsed = SearchDocumentsSchema.parse(args);
        const results = await paperlessClient.searchDocuments(parsed);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "get_document": {
        const parsed = GetDocumentSchema.parse(args);
        const document = await paperlessClient.getDocument(parsed.document_id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(document, null, 2),
            },
          ],
        };
      }

      case "update_document": {
        const parsed = UpdateDocumentSchema.parse(args);
        const { document_id, ...updateData } = parsed;
        const updated = await paperlessClient.updateDocument(document_id, updateData);
        return {
          content: [
            {
              type: "text",
              text: `Document ${document_id} updated successfully: ${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      }

      case "list_tags": {
        const tags = await paperlessClient.listTags();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tags, null, 2),
            },
          ],
        };
      }

      case "list_correspondents": {
        const correspondents = await paperlessClient.listCorrespondents();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(correspondents, null, 2),
            },
          ],
        };
      }

      case "list_document_types": {
        const documentTypes = await paperlessClient.listDocumentTypes();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(documentTypes, null, 2),
            },
          ],
        };
      }

      case "create_tag": {
        const parsed = CreateTagSchema.parse(args);
        const tag = await paperlessClient.createTag(parsed);
        return {
          content: [
            {
              type: "text",
              text: `Tag created successfully: ${JSON.stringify(tag, null, 2)}`,
            },
          ],
        };
      }

      case "create_correspondent": {
        const parsed = CreateCorrespondentSchema.parse(args);
        const correspondent = await paperlessClient.createCorrespondent(parsed);
        return {
          content: [
            {
              type: "text",
              text: `Correspondent created successfully: ${JSON.stringify(correspondent, null, 2)}`,
            },
          ],
        };
      }

      case "create_document_type": {
        const parsed = CreateDocumentTypeSchema.parse(args);
        const documentType = await paperlessClient.createDocumentType(parsed);
        return {
          content: [
            {
              type: "text",
              text: `Document type created successfully: ${JSON.stringify(documentType, null, 2)}`,
            },
          ],
        };
      }

      case "download_document": {
        const parsed = GetDocumentSchema.parse(args);
        const downloadUrl = await paperlessClient.getDownloadUrl(parsed.document_id);
        return {
          content: [
            {
              type: "text",
              text: `Download URL: ${downloadUrl}`,
            },
          ],
        };
      }

      case "bulk_update_documents": {
        const parsed = BulkUpdateDocumentsSchema.parse(args);
        const result = await paperlessClient.bulkUpdateDocuments({ documents: parsed.documents });
        
        let responseText = `Bulk update completed:\n`;
        responseText += `✅ Successfully updated: ${result.updated_count} documents\n`;
        
        if (result.failed_updates.length > 0) {
          responseText += `❌ Failed updates: ${result.failed_updates.length}\n\nFailure details:\n`;
          result.failed_updates.forEach(failure => {
            responseText += `- Document ID ${failure.id}: ${failure.error}\n`;
          });
        }

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Resource handlers for document content
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    // Get recent documents as resources
    const documents = await paperlessClient.searchDocuments({ limit: 50 });
    const resources = documents.results.map((doc: PaperlessDocument) => ({
      uri: `paperless://document/${doc.id}`,
      name: doc.title || `Document ${doc.id}`,
      description: `Document from ${doc.correspondent?.name || 'Unknown'} - ${doc.document_type?.name || 'No type'}`,
      mimeType: "text/plain",
    }));

    return { resources };
  } catch (error) {
    console.error("Error listing resources:", error);
    return { resources: [] };
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  
  if (!uri.startsWith("paperless://document/")) {
    throw new Error(`Unsupported resource URI: ${uri}`);
  }

  const documentId = parseInt(uri.replace("paperless://document/", ""));
  if (isNaN(documentId)) {
    throw new Error(`Invalid document ID in URI: ${uri}`);
  }

  try {
    const document = await paperlessClient.getDocument(documentId);
    const content = await paperlessClient.getDocumentContent(documentId);
    
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `Title: ${document.title || 'Untitled'}
Correspondent: ${document.correspondent?.name || 'None'}
Document Type: ${document.document_type?.name || 'None'}
Tags: ${document.tags?.map((tag: any) => tag.name).join(', ') || 'None'}
Created: ${document.created}
Modified: ${document.modified}

Content:
${content}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read document ${documentId}: ${errorMessage}`);
  }
});

// Start the server
async function main() {
  if (MCP_TRANSPORT === "http") {
    // HTTP transport with SSE
    const http = await import("http");
    const url = await import("url");
    
    const transports = new Map<string, SSEServerTransport>();
    
    const httpServer = http.createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }
      
      const parsedUrl = url.parse(req.url, true);
      
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      
      // Health check endpoint
      if (parsedUrl.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", server: "paperless-mcp" }));
        return;
      }
      
      // MCP SSE endpoint
      if (parsedUrl.pathname === "/message") {
        if (req.method === "GET") {
          // Start SSE connection
          const transport = new SSEServerTransport("/message", res);
          const sessionId = transport.sessionId;
          transports.set(sessionId, transport);
          
          transport.onclose = () => {
            transports.delete(sessionId);
          };
          
          await server.connect(transport);
          await transport.start();
        } else if (req.method === "POST") {
          // Handle POST message
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          
          req.on("end", async () => {
            try {
              const parsedBody = JSON.parse(body);
              const sessionId = parsedUrl.query.sessionId as string;
              const transport = transports.get(sessionId);
              
              if (transport) {
                await transport.handlePostMessage(req, res, parsedBody);
              } else {
                res.writeHead(404);
                res.end("Session not found");
              }
            } catch (error) {
              console.error("Error handling POST message:", error);
              res.writeHead(400);
              res.end("Invalid JSON");
            }
          });
        } else {
          res.writeHead(405);
          res.end("Method not allowed");
        }
        return;
      }
      
      // 404 for other paths
      res.writeHead(404);
      res.end("Not Found");
    });
    
    httpServer.listen(MCP_PORT, () => {
      console.error(`Paperless MCP server running on HTTP port ${MCP_PORT}`);
      console.error(`Health check: http://localhost:${MCP_PORT}/health`);
      console.error(`MCP endpoint: http://localhost:${MCP_PORT}/message`);
    });
  } else {
    // STDIO transport (default)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Paperless MCP server running on stdio");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});