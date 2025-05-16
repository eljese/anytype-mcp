# Anytype MCP Server

The Anytype MCP Server is a Model Context Protocol (MCP) server implementation, enabling AI assistants to seamlessly interact with Anytype's API through natural language.

## Overview

This project implements an MCP server that acts as a bridge between AI assistants and the Anytype API. It converts Anytype's OpenAPI specification into MCP tools that AI assistants can understand and use.

## Features

- OpenAPI v3.1 specification support
- Automatic conversion of API endpoints to MCP tools
- Secure authentication handling
- CLI tool for testing and development

## Quick Start

1. Build the project:

```bash
npm run build
```

2. Link the package globally (optional):

```bash
npm link
```

3. Get your Anytype API key:

```bash
anytype-mcp get-key
```

4. Add the config to your MCP client settings:

```json
{
  "mcpServers": {
    "anytype": {
      "command": "npx",
      "args": [
        "anytype-mcp",
        "run",
      ],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\":\"Bearer <YOUR_API_KEY>\", \"Anytype-Version\":\"2025-05-20\"}"
      }
    }
  }
}
```

## Development

### Prerequisites

- Node.js >= 16
- npm

### Setup

1. Clone the repository:

```bash
git clone https://github.com/anyproto/anytype-mcp.git
cd anytype-mcp
```

2. Install dependencies:

```bash
npm install -D
```

3. Build the project:

```bash
npm run build
```

## Contribution

Thank you for your desire to develop Anytype together!

❤️ This project and everyone involved in it is governed by the [Code of Conduct](https://github.com/anyproto/.github/blob/main/docs/CODE_OF_CONDUCT.md).

🧑‍💻 Check out our [contributing guide](https://github.com/anyproto/.github/blob/main/docs/CONTRIBUTING.md) to learn about asking questions, creating issues, or submitting pull requests.

🫢 For security findings, please email [security@anytype.io](mailto:security@anytype.io) and refer to our [security guide](https://github.com/anyproto/.github/blob/main/docs/SECURITY.md) for more information.

🤝 Follow us on [Github](https://github.com/anyproto) and join the [Contributors Community](https://github.com/orgs/anyproto/discussions).

---

Made by Any — a Swiss association 🇨🇭

Licensed under [MIT](./LICENSE.md).
