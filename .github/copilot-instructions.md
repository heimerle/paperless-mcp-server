<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
	<!-- MCP Server for Paperless-ngx integration using TypeScript 
    Overview
    What is Paperless-NGX MCP Server?
    Paperless-NGX MCP Server is a tool designed to manage documents, tags, correspondents, and document types within a Paperless-NGX instance through an AI assistant. It enhances productivity by automating document management tasks.

    Key features of Paperless-NGX MCP Server?
    Seamless document management including searching, uploading, tagging, and bulk editing.
    Integration with AI for enhanced document handling.
    Support for various document operations like listing, downloading, and editing.
    Use cases of Paperless-NGX MCP Server?
    Automating document uploads and organization.
    Searching for specific documents using tags or keywords.
    Performing bulk edits on multiple documents to streamline management tasks.

    Paperless API should be used for this integration and fully be covered by mcp server implementation.

	http and stdio transport should be supported.
	port 3000 for http transport by default.

    -->
- [x] Scaffold the Project
	<!-- 
	✅ Created complete TypeScript MCP server project structure:
	- package.json with all dependencies (MCP SDK, TypeScript, Zod, Axios)
	- tsconfig.json for TypeScript configuration
	- src/index.ts - Main MCP server implementation
	- src/paperless-client.ts - Paperless-ngx API client
	- README.md with comprehensive documentation
	- .gitignore for proper version control
	- .env.example for configuration
	- .vscode/mcp.json for VS Code MCP debugging
	-->

- [x] Customize the Project
	<!--
	✅ Customized for Paperless-ngx integration:
	- Implemented comprehensive Paperless-ngx API client
	- Added 10 MCP tools covering document search, metadata management, and CRUD operations
	- Added resource handlers for document content access
	- Integrated with Paperless-ngx API endpoints for documents, tags, correspondents, and document types
	- Added proper error handling and validation with Zod schemas
	- Configured for both local and remote Paperless-ngx instances
	-->

- [x] Install Required Extensions
	<!-- No additional extensions required for MCP TypeScript project beyond standard TypeScript support -->

- [x] Compile the Project
	<!--
	✅ Project compiled successfully:
	- Installed all dependencies with npm install
	- Resolved TypeScript type issues with optional properties
	- Built project with npm run build
	- Generated executable dist/index.js with proper permissions
	-->

- [x] Create and Run Task
	<!--
	Verify that all previous steps have been completed.
	Check https://code.visualstudio.com/docs/debugtest/tasks to determine if the project needs a task. If so, use the create_and_run_task to create and launch a task based on package.json, README.md, and project structure.
	Skip this step otherwise.
	 -->

- [ ] Launch the Project
	<!--
	Verify that all previous steps have been completed.
	Prompt user for debug mode, launch only if confirmed.
	 -->

- [x] Ensure Documentation is Complete
	<!--
	✅ Documentation completed:
	- README.md created with comprehensive setup and usage instructions
	- .env.example created with configuration template
	- .vscode/mcp.json created for VS Code MCP debugging configuration
	- All project files properly documented
	 -->