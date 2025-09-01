# Mem0 Memory MCP Server

A Model Context Protocol (MCP) server that provides memory storage and retrieval capabilities using [Mem0](https://mem0.ai). This server allows AI agents to store and search through memories, making it useful for maintaining context and making informed decisions based on past interactions.

## Features

- Store memories with user-specific context
- Search through stored memories with relevance scoring
- Simple and intuitive API
- Built on the Model Context Protocol
- Automatic error handling
- Support for multiple user contexts
- Deployable on [Smithery](https://smithery.ai)

## Installation

### Using npx (Recommended)

```bash
npx -y @mem0/mcp
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server with Smithery playground
npm run dev

# Build the project
npm run build
```

## Configuration

The server requires a Mem0 API key to function. You can obtain one from [Mem0 Dashboard](https://app.mem0.ai/dashboard/api-keys).

### For Smithery Deployment

When deploying on Smithery, users will be prompted to provide their API key through the configuration interface.

### For Local Development

Create a `.env` file in the root directory:

```bash
MEM0_API_KEY=your-api-key-here
```

## Available Tools

### 1. Add Memory (`add-memory`)

Store new memories with user-specific context.

**Parameters:**
- `content` (string, required): The content to store in memory
- `userId` (string, required): User ID for memory storage

### 2. Search Memories (`search-memories`)

Search through stored memories to retrieve relevant information.

**Parameters:**
- `query` (string, required): The search query
- `userId` (string, required): User ID for memory storage

## Usage with MCP Clients

### Cursor

1. Open Cursor Settings
2. Go to Features > MCP Servers
3. Add the server configuration:

```json
{
  "mcpServers": {
    "mem0-mcp": {
      "command": "npx",
      "args": ["-y", "@mem0/mcp"],
      "env": {
        "MEM0_API_KEY": "YOUR-API-KEY-HERE"
      }
    }
  }
}
```

### VS Code

Add to your User Settings (JSON):

```json
{
  "mcp": {
    "inputs": [
      {
        "type": "promptString",
        "id": "apiKey",
        "description": "Mem0 API Key",
        "password": true
      }
    ],
    "servers": {
      "mem0-memory": {
        "command": "npx",
        "args": ["-y", "@mem0/mcp"],
        "env": {
          "MEM0_API_KEY": "${input:apiKey}"
        }
      }
    }
  }
}
```

## Deployment on Smithery

This server is configured for deployment on [Smithery](https://smithery.ai):

1. Push your code to GitHub
2. Connect your repository to Smithery
3. Deploy from the Deployments tab

The server will be available via Smithery's Streamable HTTP transport, allowing users to connect without installing dependencies locally.

## Development

### Project Structure

```
mem0-mcp/
├── src/
│   └── index.ts       # Main server implementation
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── tsup.config.ts     # Build configuration
├── smithery.yaml      # Smithery deployment config
└── README.md
```

### Scripts

- `npm run dev` - Start development server with Smithery playground
- `npm run build` - Build the project using Smithery CLI
- `npm run build:local` - Build using tsup directly
- `npm run dev:local` - Watch mode with tsup
- `npm start` - Run the built server

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT