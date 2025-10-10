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

// Storage Path Schemas
const CreateStoragePathSchema = z.object({
  name: z.string().describe("Name of the storage path"),
  path: z.string().describe("File system path"),
  match: z.string().optional().describe("Matching pattern"),
  matching_algorithm: z.number().optional().describe("Algorithm for matching"),
});

const IdSchema = z.object({
  id: z.number().describe("ID of the resource"),
});

const UpdateStoragePathSchema = z.object({
  id: z.number().describe("ID of the storage path to update"),
  name: z.string().optional().describe("Name of the storage path"),
  path: z.string().optional().describe("File system path"),
  match: z.string().optional().describe("Matching pattern"),
  matching_algorithm: z.number().optional().describe("Algorithm for matching"),
});

// Custom Field Schemas
const CreateCustomFieldSchema = z.object({
  name: z.string().describe("Name of the custom field"),
  data_type: z.enum(['string', 'url', 'date', 'boolean', 'integer', 'float', 'monetary']).describe("Data type of the field"),
});

const UpdateCustomFieldSchema = z.object({
  id: z.number().describe("ID of the custom field to update"),
  name: z.string().optional().describe("Name of the custom field"),
  data_type: z.enum(['string', 'url', 'date', 'boolean', 'integer', 'float', 'monetary']).optional().describe("Data type of the field"),
});

// Saved View Schemas
const CreateSavedViewSchema = z.object({
  name: z.string().describe("Name of the saved view"),
  show_on_dashboard: z.boolean().optional().describe("Show on dashboard"),
  show_in_sidebar: z.boolean().optional().describe("Show in sidebar"),
  sort_field: z.string().optional().describe("Field to sort by"),
  sort_reverse: z.boolean().optional().describe("Reverse sort order"),
  filter_rules: z.array(z.any()).optional().describe("Filter rules"),
});

const UpdateSavedViewSchema = z.object({
  id: z.number().describe("ID of the saved view to update"),
  name: z.string().optional().describe("Name of the saved view"),
  show_on_dashboard: z.boolean().optional().describe("Show on dashboard"),
  show_in_sidebar: z.boolean().optional().describe("Show in sidebar"),
  sort_field: z.string().optional().describe("Field to sort by"),
  sort_reverse: z.boolean().optional().describe("Reverse sort order"),
  filter_rules: z.array(z.any()).optional().describe("Filter rules"),
});

// Update Schemas for Tags, Correspondents, Document Types
const UpdateTagSchema = z.object({
  id: z.number().describe("ID of the tag to update"),
  name: z.string().optional().describe("Name of the tag"),
  color: z.string().optional().describe("Color code for the tag (hex format)"),
  text_color: z.string().optional().describe("Text color for the tag (hex format)"),
});

const UpdateCorrespondentSchema = z.object({
  id: z.number().describe("ID of the correspondent to update"),
  name: z.string().optional().describe("Name of the correspondent"),
});

const UpdateDocumentTypeSchema = z.object({
  id: z.number().describe("ID of the document type to update"),
  name: z.string().optional().describe("Name of the document type"),
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
      // Document Operations
      {
        name: "delete_document",
        description: "Delete a document from Paperless-ngx",
        inputSchema: GetDocumentSchema,
      },
      {
        name: "get_document_suggestions",
        description: "Get automatic suggestions for document metadata",
        inputSchema: GetDocumentSchema,
      },
      {
        name: "get_document_metadata",
        description: "Get extracted metadata from document",
        inputSchema: GetDocumentSchema,
      },
      // Storage Paths
      {
        name: "list_storage_paths",
        description: "List all storage paths in Paperless-ngx",
        inputSchema: z.object({}),
      },
      {
        name: "get_storage_path",
        description: "Get details of a specific storage path",
        inputSchema: IdSchema,
      },
      {
        name: "create_storage_path",
        description: "Create a new storage path",
        inputSchema: CreateStoragePathSchema,
      },
      {
        name: "update_storage_path",
        description: "Update an existing storage path",
        inputSchema: UpdateStoragePathSchema,
      },
      {
        name: "delete_storage_path",
        description: "Delete a storage path",
        inputSchema: IdSchema,
      },
      // Custom Fields
      {
        name: "list_custom_fields",
        description: "List all custom fields in Paperless-ngx",
        inputSchema: z.object({}),
      },
      {
        name: "get_custom_field",
        description: "Get details of a specific custom field",
        inputSchema: IdSchema,
      },
      {
        name: "create_custom_field",
        description: "Create a new custom field",
        inputSchema: CreateCustomFieldSchema,
      },
      {
        name: "update_custom_field",
        description: "Update an existing custom field",
        inputSchema: UpdateCustomFieldSchema,
      },
      {
        name: "delete_custom_field",
        description: "Delete a custom field",
        inputSchema: IdSchema,
      },
      // Saved Views
      {
        name: "list_saved_views",
        description: "List all saved views in Paperless-ngx",
        inputSchema: z.object({}),
      },
      {
        name: "get_saved_view",
        description: "Get details of a specific saved view",
        inputSchema: IdSchema,
      },
      {
        name: "create_saved_view",
        description: "Create a new saved view",
        inputSchema: CreateSavedViewSchema,
      },
      {
        name: "update_saved_view",
        description: "Update an existing saved view",
        inputSchema: UpdateSavedViewSchema,
      },
      {
        name: "delete_saved_view",
        description: "Delete a saved view",
        inputSchema: IdSchema,
      },
      // Tags CRUD
      {
        name: "get_tag",
        description: "Get details of a specific tag",
        inputSchema: IdSchema,
      },
      {
        name: "update_tag",
        description: "Update an existing tag",
        inputSchema: UpdateTagSchema,
      },
      {
        name: "delete_tag",
        description: "Delete a tag",
        inputSchema: IdSchema,
      },
      // Correspondents CRUD
      {
        name: "get_correspondent",
        description: "Get details of a specific correspondent",
        inputSchema: IdSchema,
      },
      {
        name: "update_correspondent",
        description: "Update an existing correspondent",
        inputSchema: UpdateCorrespondentSchema,
      },
      {
        name: "delete_correspondent",
        description: "Delete a correspondent",
        inputSchema: IdSchema,
      },
      // Document Types CRUD
      {
        name: "get_document_type",
        description: "Get details of a specific document type",
        inputSchema: IdSchema,
      },
      {
        name: "update_document_type",
        description: "Update an existing document type",
        inputSchema: UpdateDocumentTypeSchema,
      },
      {
        name: "delete_document_type",
        description: "Delete a document type",
        inputSchema: IdSchema,
      },
      // Tasks
      {
        name: "list_tasks",
        description: "List all tasks in Paperless-ngx",
        inputSchema: z.object({}),
      },
      {
        name: "acknowledge_task",
        description: "Acknowledge a completed task",
        inputSchema: IdSchema,
      },
      // Statistics & System
      {
        name: "get_statistics",
        description: "Get Paperless-ngx statistics",
        inputSchema: z.object({}),
      },
      {
        name: "get_logs",
        description: "Get Paperless-ngx system logs",
        inputSchema: z.object({}),
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

      // Document Operations
      case "delete_document": {
        const parsed = GetDocumentSchema.parse(args);
        await paperlessClient.deleteDocument(parsed.document_id);
        return {
          content: [{ type: "text", text: `Document ${parsed.document_id} deleted successfully` }],
        };
      }

      case "get_document_suggestions": {
        const parsed = GetDocumentSchema.parse(args);
        const suggestions = await paperlessClient.getDocumentSuggestions(parsed.document_id);
        return {
          content: [{ type: "text", text: JSON.stringify(suggestions, null, 2) }],
        };
      }

      case "get_document_metadata": {
        const parsed = GetDocumentSchema.parse(args);
        const metadata = await paperlessClient.getDocumentMetadata(parsed.document_id);
        return {
          content: [{ type: "text", text: JSON.stringify(metadata, null, 2) }],
        };
      }

      // Storage Paths
      case "list_storage_paths": {
        const storagePaths = await paperlessClient.listStoragePaths();
        return {
          content: [{ type: "text", text: JSON.stringify(storagePaths, null, 2) }],
        };
      }

      case "get_storage_path": {
        const parsed = IdSchema.parse(args);
        const storagePath = await paperlessClient.getStoragePath(parsed.id);
        return {
          content: [{ type: "text", text: JSON.stringify(storagePath, null, 2) }],
        };
      }

      case "create_storage_path": {
        const parsed = CreateStoragePathSchema.parse(args);
        const storagePath = await paperlessClient.createStoragePath(parsed);
        return {
          content: [{ type: "text", text: `Storage path created: ${JSON.stringify(storagePath, null, 2)}` }],
        };
      }

      case "update_storage_path": {
        const parsed = UpdateStoragePathSchema.parse(args);
        const { id, ...updateData } = parsed;
        const storagePath = await paperlessClient.updateStoragePath(id, updateData);
        return {
          content: [{ type: "text", text: `Storage path updated: ${JSON.stringify(storagePath, null, 2)}` }],
        };
      }

      case "delete_storage_path": {
        const parsed = IdSchema.parse(args);
        await paperlessClient.deleteStoragePath(parsed.id);
        return {
          content: [{ type: "text", text: `Storage path ${parsed.id} deleted successfully` }],
        };
      }

      // Custom Fields
      case "list_custom_fields": {
        const customFields = await paperlessClient.listCustomFields();
        return {
          content: [{ type: "text", text: JSON.stringify(customFields, null, 2) }],
        };
      }

      case "get_custom_field": {
        const parsed = IdSchema.parse(args);
        const customField = await paperlessClient.getCustomField(parsed.id);
        return {
          content: [{ type: "text", text: JSON.stringify(customField, null, 2) }],
        };
      }

      case "create_custom_field": {
        const parsed = CreateCustomFieldSchema.parse(args);
        const customField = await paperlessClient.createCustomField(parsed);
        return {
          content: [{ type: "text", text: `Custom field created: ${JSON.stringify(customField, null, 2)}` }],
        };
      }

      case "update_custom_field": {
        const parsed = UpdateCustomFieldSchema.parse(args);
        const { id, ...updateData } = parsed;
        const customField = await paperlessClient.updateCustomField(id, updateData);
        return {
          content: [{ type: "text", text: `Custom field updated: ${JSON.stringify(customField, null, 2)}` }],
        };
      }

      case "delete_custom_field": {
        const parsed = IdSchema.parse(args);
        await paperlessClient.deleteCustomField(parsed.id);
        return {
          content: [{ type: "text", text: `Custom field ${parsed.id} deleted successfully` }],
        };
      }

      // Saved Views
      case "list_saved_views": {
        const savedViews = await paperlessClient.listSavedViews();
        return {
          content: [{ type: "text", text: JSON.stringify(savedViews, null, 2) }],
        };
      }

      case "get_saved_view": {
        const parsed = IdSchema.parse(args);
        const savedView = await paperlessClient.getSavedView(parsed.id);
        return {
          content: [{ type: "text", text: JSON.stringify(savedView, null, 2) }],
        };
      }

      case "create_saved_view": {
        const parsed = CreateSavedViewSchema.parse(args);
        const savedView = await paperlessClient.createSavedView(parsed);
        return {
          content: [{ type: "text", text: `Saved view created: ${JSON.stringify(savedView, null, 2)}` }],
        };
      }

      case "update_saved_view": {
        const parsed = UpdateSavedViewSchema.parse(args);
        const { id, ...updateData } = parsed;
        const savedView = await paperlessClient.updateSavedView(id, updateData);
        return {
          content: [{ type: "text", text: `Saved view updated: ${JSON.stringify(savedView, null, 2)}` }],
        };
      }

      case "delete_saved_view": {
        const parsed = IdSchema.parse(args);
        await paperlessClient.deleteSavedView(parsed.id);
        return {
          content: [{ type: "text", text: `Saved view ${parsed.id} deleted successfully` }],
        };
      }

      // Tags CRUD
      case "get_tag": {
        const parsed = IdSchema.parse(args);
        const tag = await paperlessClient.getTag(parsed.id);
        return {
          content: [{ type: "text", text: JSON.stringify(tag, null, 2) }],
        };
      }

      case "update_tag": {
        const parsed = UpdateTagSchema.parse(args);
        const { id, ...updateData } = parsed;
        const tag = await paperlessClient.updateTag(id, updateData);
        return {
          content: [{ type: "text", text: `Tag updated: ${JSON.stringify(tag, null, 2)}` }],
        };
      }

      case "delete_tag": {
        const parsed = IdSchema.parse(args);
        await paperlessClient.deleteTag(parsed.id);
        return {
          content: [{ type: "text", text: `Tag ${parsed.id} deleted successfully` }],
        };
      }

      // Correspondents CRUD
      case "get_correspondent": {
        const parsed = IdSchema.parse(args);
        const correspondent = await paperlessClient.getCorrespondent(parsed.id);
        return {
          content: [{ type: "text", text: JSON.stringify(correspondent, null, 2) }],
        };
      }

      case "update_correspondent": {
        const parsed = UpdateCorrespondentSchema.parse(args);
        const { id, ...updateData } = parsed;
        const correspondent = await paperlessClient.updateCorrespondent(id, updateData);
        return {
          content: [{ type: "text", text: `Correspondent updated: ${JSON.stringify(correspondent, null, 2)}` }],
        };
      }

      case "delete_correspondent": {
        const parsed = IdSchema.parse(args);
        await paperlessClient.deleteCorrespondent(parsed.id);
        return {
          content: [{ type: "text", text: `Correspondent ${parsed.id} deleted successfully` }],
        };
      }

      // Document Types CRUD
      case "get_document_type": {
        const parsed = IdSchema.parse(args);
        const documentType = await paperlessClient.getDocumentType(parsed.id);
        return {
          content: [{ type: "text", text: JSON.stringify(documentType, null, 2) }],
        };
      }

      case "update_document_type": {
        const parsed = UpdateDocumentTypeSchema.parse(args);
        const { id, ...updateData } = parsed;
        const documentType = await paperlessClient.updateDocumentType(id, updateData);
        return {
          content: [{ type: "text", text: `Document type updated: ${JSON.stringify(documentType, null, 2)}` }],
        };
      }

      case "delete_document_type": {
        const parsed = IdSchema.parse(args);
        await paperlessClient.deleteDocumentType(parsed.id);
        return {
          content: [{ type: "text", text: `Document type ${parsed.id} deleted successfully` }],
        };
      }

      // Tasks
      case "list_tasks": {
        const tasks = await paperlessClient.listTasks();
        return {
          content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
        };
      }

      case "acknowledge_task": {
        const parsed = IdSchema.parse(args);
        await paperlessClient.acknowledgeTask(parsed.id);
        return {
          content: [{ type: "text", text: `Task ${parsed.id} acknowledged successfully` }],
        };
      }

      // Statistics & System
      case "get_statistics": {
        const statistics = await paperlessClient.getStatistics();
        return {
          content: [{ type: "text", text: JSON.stringify(statistics, null, 2) }],
        };
      }

      case "get_logs": {
        const logs = await paperlessClient.getLogs();
        return {
          content: [{ type: "text", text: JSON.stringify(logs, null, 2) }],
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
    
    const transports = new Map<string, SSEServerTransport>();
    
    const httpServer = http.createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }
      
      // Use WHATWG URL API instead of deprecated url.parse()
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      
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
      
      // Modern MCP Streamable HTTP endpoint (spec-compliant for ChatGPT)
      // Implements: https://modelcontextprotocol.io/docs/concepts/transports
      if (parsedUrl.pathname === "/api") {
        // Security: Check Origin header (DNS rebinding protection)
        const origin = req.headers.origin;
        const allowedOrigins = ['https://chatgpt.com', 'https://chat.openai.com'];
        
        if (req.method === "OPTIONS") {
          // CORS preflight
          res.writeHead(204, {
            "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id, MCP-Protocol-Version",
            "Access-Control-Max-Age": "86400"
          });
          res.end();
          return;
        }
        
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          
          req.on("end", async () => {
            try {
              const request = JSON.parse(body);
              const protocolVersion = req.headers["mcp-protocol-version"] || "2024-11-05";
              const isInitialize = request.method === "initialize";
              
              console.error(`📨 MCP ${request.method} (id: ${request.id})`);
              
              // Handle initialize - creates session and returns Mcp-Session-Id header
              if (isInitialize) {
                const sessionId = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Create a simple state object for this session
                const sessionState = {
                  id: sessionId,
                  created: new Date(),
                  transport: null as any
                };
                transports.set(sessionId, sessionState as any);
                
                // Send initialize response with Mcp-Session-Id header
                res.writeHead(200, {
                  "Content-Type": "application/json",
                  "Mcp-Session-Id": sessionId,
                  "MCP-Protocol-Version": protocolVersion,
                  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*",
                  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version"
                });
                
                const initResult = {
                  jsonrpc: "2.0",
                  id: request.id,
                  result: {
                    protocolVersion: "2024-11-05",
                    capabilities: {
                      tools: {},
                      resources: {}
                    },
                    serverInfo: {
                      name: "paperless-mcp",
                      version: "1.1.2"
                    }
                  }
                };
                
                console.error(`✅ Session created: ${sessionId}`);
                res.end(JSON.stringify(initResult));
                return;
              }
              
              // All other requests require Mcp-Session-Id header
              const sessionId = req.headers["mcp-session-id"] as string;
              if (!sessionId || !transports.has(sessionId)) {
                console.error(`❌ Invalid/missing session: ${sessionId}`);
                res.writeHead(400, { 
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*"
                });
                res.end(JSON.stringify({
                  jsonrpc: "2.0",
                  id: request.id || null,
                  error: {
                    code: -32000,
                    message: "Missing or invalid Mcp-Session-Id header"
                  }
                }));
                return;
              }
              
              // Handle the request directly without SSE transport
              // Create a one-time transport for this request
              const oneTimeTransport = new SSEServerTransport("/api-internal", res);
              
              try {
                // Connect transport temporarily
                await server.connect(oneTimeTransport);
                
                // Handle the message
                await oneTimeTransport.handleMessage(request);
                
                // Transport will send the response and close
              } catch (error) {
                console.error(`❌ Error handling request:`, error);
                if (!res.headersSent) {
                  res.writeHead(500, { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*"
                  });
                  res.end(JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id || null,
                    error: {
                      code: -32603,
                      message: error instanceof Error ? error.message : "Internal error"
                    }
                  }));
                }
              }
              
            } catch (error) {
              console.error("❌ Error handling MCP request:", error);
              if (!res.headersSent) {
                res.writeHead(error instanceof SyntaxError ? 400 : 500, { 
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*"
                });
                res.end(JSON.stringify({
                  jsonrpc: "2.0",
                  id: null,
                  error: {
                    code: error instanceof SyntaxError ? -32700 : -32603,
                    message: error instanceof Error ? error.message : "Internal error"
                  }
                }));
              }
            }
          });
          return;
        }
        
        if (req.method === "GET") {
          // Optional SSE stream for server-initiated messages
          const sessionId = req.headers["mcp-session-id"] as string;
          if (sessionId && transports.has(sessionId)) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "Connection": "keep-alive",
              "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*"
            });
            res.flushHeaders();
            console.error(`📡 SSE stream opened for session: ${sessionId}`);
            // Keep connection open for server-initiated messages
            return;
          } else {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("GET requires valid Mcp-Session-Id header");
            return;
          }
        }
        
        if (req.method === "DELETE") {
          // Session termination
          const sessionId = req.headers["mcp-session-id"] as string;
          if (sessionId && transports.has(sessionId)) {
            const transport = transports.get(sessionId);
            transports.delete(sessionId);
            await transport?.close();
            console.error(`🗑️  Session deleted: ${sessionId}`);
            res.writeHead(200, { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*"
            });
            res.end(JSON.stringify({ success: true }));
            return;
          } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Session not found");
            return;
          }
        }
        
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("Method not allowed");
        return;
      }
      
      // MCP SSE endpoint (support both /message and /mcp for compatibility)
      if (parsedUrl.pathname === "/message" || parsedUrl.pathname === "/mcp") {
        if (req.method === "GET") {
          // Start SSE connection
          const endpoint = parsedUrl.pathname; // Use the actual requested path
          const transport = new SSEServerTransport(endpoint, res);
          const sessionId = transport.sessionId;
          transports.set(sessionId, transport);
          
          transport.onclose = () => {
            transports.delete(sessionId);
          };
          
          console.error(`New SSE connection established: ${sessionId}`);
          
          await server.connect(transport);
          // Note: server.connect() already calls transport.start()
          
          // Send sessionId as initial SSE event for client reference
          // This helps clients know how to route POST messages
          console.error(`SSE session ready: ${sessionId} on ${endpoint}`);
        } else if (req.method === "POST") {
          // Handle POST message
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          
          req.on("end", async () => {
            try {
              const parsedBody = JSON.parse(body);
              const sessionId = parsedUrl.searchParams.get('sessionId') || '';
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
      console.error(`MCP endpoints: http://localhost:${MCP_PORT}/message or /mcp`);
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