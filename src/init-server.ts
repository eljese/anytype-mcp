import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { OpenAPIV3 } from "openapi-types";
import { MCPProxy } from "./mcp/proxy";

export class ValidationError extends Error {
  constructor(public errors: any[]) {
    super("OpenAPI validation failed");
    this.name = "ValidationError";
  }
}

export async function loadOpenApiSpec(specPath?: string): Promise<OpenAPIV3.Document> {
  const finalSpec = specPath || "http://10.10.9.2:31009/docs/openapi.json";
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
    try {
      rawSpec = fs.readFileSync(filePath, "utf-8");
    } catch (error: any) {
      console.error("Failed to read OpenAPI specification file:", error.message || String(error));
      process.exit(1);
    }
  }

  try {
    const spec = JSON.parse(rawSpec) as OpenAPIV3.Document;

    // PATCH: Inject File Upload Endpoint if missing
            if (spec.paths["/v1/spaces/{space_id}"] && spec.paths["/v1/spaces/{space_id}"].patch) {
              spec.paths["/v1/spaces/{space_id}"].patch = {
                operationId: "create_file",
                summary: "Create File",
                description: "Upload a file to a space using streaming proxy",
                parameters: [
                  {
                    name: "space_id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                  },
                ],
                requestBody: {
                  required: true,
                  content: {
                    "multipart/form-data": {
                      schema: {
                        type: "object",
                        properties: {
                          file: {
                            type: "string",
                            format: "binary",
                            description: "Absolute path to the local file to upload",
                          },
                          space_id: {
                            type: "string",
                            description: "The ID of the space to upload to",
                          },
                        },
                        required: ["file", "space_id"],
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "File uploaded successfully",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            fileId: { type: "string" },
                            cid: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              };
              console.error("Hijacked /v1/spaces/{space_id} PATCH for file uploads (multipart/form-data).");
            }

    return spec;
  } catch (error: any) {
    console.error("Failed to parse OpenAPI specification:", error.message);
    process.exit(1);
  }
}

export async function initProxy(specPath: string) {
  console.error("Initializing Anytype MCP Server...");
  const openApiSpec = await loadOpenApiSpec(specPath);
  const proxy = new MCPProxy("Anytype API", openApiSpec);

  await proxy.connect(new StdioServerTransport());
  console.error("Anytype MCP Server running on stdio");
}
