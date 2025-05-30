import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import yaml from "js-yaml";
import fs from "node:fs";
import path from "node:path";
import { OpenAPIV3 } from "openapi-types";
import { AppKeyGenerator } from "../src/auth/get-key";
import { MCPProxy } from "../src/mcp/proxy";

export class ValidationError extends Error {
  constructor(public errors: any[]) {
    super("OpenAPI validation failed");
    this.name = "ValidationError";
  }
}

function isYamlFile(filePath: string): boolean {
  return filePath.endsWith(".yaml") || filePath.endsWith(".yml");
}

export async function loadOpenApiSpec(specPath?: string): Promise<OpenAPIV3.Document> {
  const defaultSpecUrl = "http://localhost:31009/docs/openapi.yaml";
  const finalSpec = specPath || defaultSpecUrl;
  let rawSpec: string;

  if (finalSpec.startsWith("http://") || finalSpec.startsWith("https://")) {
    try {
      const response = await axios.get(finalSpec);
      rawSpec = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    } catch (error: any) {
      if (error.code === "ECONNREFUSED") {
        console.error("Can't connect to API. Please ensure Anytype is running and reachable.");
        process.exit(1);
      }
      console.error("Failed to fetch OpenAPI specification from URL:", error.message);
      process.exit(1);
    }
  } else {
    const filePath = path.resolve(process.cwd(), finalSpec);
    rawSpec = fs.readFileSync(filePath, "utf-8");
  }

  return isYamlFile(finalSpec)
    ? (yaml.load(rawSpec) as OpenAPIV3.Document)
    : (JSON.parse(rawSpec) as OpenAPIV3.Document);
}

export async function initProxy(specPath: string) {
  const openApiSpec = await loadOpenApiSpec(specPath);
  const proxy = new MCPProxy("Anytype API", openApiSpec);

  console.error("Connecting to Anytype API...");
  return proxy.connect(new StdioServerTransport());
}

async function generateAppKey(specPath?: string) {
  const openApiSpec = await loadOpenApiSpec(specPath);
  const baseUrl = openApiSpec.servers?.[0]?.url || "http://localhost:31009";
  const generator = new AppKeyGenerator(baseUrl);
  await generator.generateAppKey();
}

export async function main(args: string[] = process.argv.slice(2)) {
  const [command, specPath] = args;
  if (!command || command === "run") {
    await initProxy(specPath);
  } else if (command === "get-key") {
    await generateAppKey(specPath);
  } else {
    console.error(`Error: Unknown command "${command}"`);
    process.exit(1);
  }
}

const shouldStart = process.argv[1].endsWith("anytype-mcp");
if (shouldStart) {
  main().catch((error) => {
    if (error instanceof ValidationError) {
      console.error("Invalid OpenAPI 3.1 specification:");
      error.errors.forEach((err) => console.error(err));
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  });
}
