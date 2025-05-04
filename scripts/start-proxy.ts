import fs from 'node:fs'
import path from 'node:path'
import { OpenAPIV3 } from 'openapi-types'
import { MCPProxy } from '../src/mcp/proxy'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import axios from 'axios'
import yaml from 'js-yaml'
import { AppKeyGenerator } from '../src/auth/get-key'

export class ValidationError extends Error {
  constructor(public errors: any[]) {
    super('OpenAPI validation failed')
    this.name = 'ValidationError'
  }
}

function isYamlFile(filePath: string): boolean {
  return filePath.endsWith('.yaml') || filePath.endsWith('.yml')
}

export async function loadOpenApiSpec(specPath: string): Promise<OpenAPIV3.Document> {
  let rawSpec: string

  // Check if the path is a URL
  if (specPath.startsWith('http://') || specPath.startsWith('https://')) {
    try {
      const response = await axios.get(specPath)
      if (typeof response.data === 'string') {
        rawSpec = response.data
      } else {
        rawSpec = JSON.stringify(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch OpenAPI specification from URL:', (error as Error).message)
      process.exit(1)
    }
  } else {
    // Load from local file system
    try {
      rawSpec = fs.readFileSync(path.resolve(process.cwd(), specPath), 'utf-8')
    } catch (error) {
      console.error('Failed to read OpenAPI specification file:', (error as Error).message)
      process.exit(1)
    }
  }

  // Parse and validate the spec
  try {
    const parsed = isYamlFile(specPath) ? yaml.load(rawSpec) : JSON.parse(rawSpec)
    return parsed as OpenAPIV3.Document
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    console.error('Failed to parse OpenAPI specification:', (error as Error).message)
    process.exit(1)
  }
}

async function runProxy(specPath: string) {
  const openApiSpec = await loadOpenApiSpec(specPath)
  const proxy = new MCPProxy('OpenAPI Tools', openApiSpec)
  
  console.error('Connecting to Claude Desktop...')
  return proxy.connect(new StdioServerTransport())
}

async function getAppKey(specPath: string) {
  const openApiSpec = await loadOpenApiSpec(specPath)
  const basePath = openApiSpec.servers?.[0]?.url || 'http://localhost:31009/v1'
  const generator = new AppKeyGenerator(basePath)
  await generator.generateAppKey()
}

// Main execution
export async function main(args: string[] = process.argv.slice(2)) {
  const command = args[0]

  if (!command) {
    console.error('Usage: any-mcp <command> [options]')
    console.error('\nCommands:')
    console.error('  get-key <swagger-file>    Generate an app key for Anytype')
    console.error('  run <swagger-file>        Run the MCP proxy with an OpenAPI spec')
    console.error('\nExamples:')
    console.error('  any-mcp get-key path/to/swagger.yaml')
    console.error('  any-mcp run path/to/swagger.yaml')
    process.exit(1)
  }

  switch (command) {
    case 'get-key':
      const getKeySpecPath = args[1]
      if (!getKeySpecPath) {
        console.error('Error: Please provide a path to the OpenAPI specification')
        console.error('Usage: any-mcp get-key <path-to-openapi-spec>')
        process.exit(1)
      }
      await getAppKey(getKeySpecPath)
      break
    case 'run':
      const runSpecPath = args[1]
      if (!runSpecPath) {
        console.error('Error: Please provide a path to the OpenAPI specification')
        console.error('Usage: any-mcp run <path-to-openapi-spec>')
        process.exit(1)
      }
      await runProxy(runSpecPath)
      break
    default:
      console.error(`Error: Unknown command "${command}"`)
      console.error('Run "any-mcp" without arguments to see available commands')
      process.exit(1)
  }
}

const shouldStart = process.argv[1].endsWith('any-mcp')
// Only run main if this is the entry point
if (shouldStart) {
  main().catch(error => {
    if (error instanceof ValidationError) {
      console.error('Invalid OpenAPI 3.1 specification:')
      error.errors.forEach(err => console.error(err))
    } else {
      console.error('Error:', error.message)
    }
    process.exit(1)
  })
}
