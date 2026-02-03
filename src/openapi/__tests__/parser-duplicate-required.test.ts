import { describe, expect, it } from "vitest";
import { OpenAPIToMCPConverter } from "../parser";
import { OpenAPIV3 } from "openapi-types";

describe("OpenAPIToMCPConverter - Duplicate Required Fields", () => {
  const duplicateRequiredSpec: OpenAPIV3.Document = {
    openapi: "3.0.0",
    info: {
      title: "Duplicate Required Test API",
      version: "1.0.0",
    },
    paths: {
      "/test": {
        post: {
          operationId: "testDuplicateRequired",
          parameters: [
            {
              name: "param1",
              in: "query",
              required: true,
              schema: { type: "string" },
            }
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  // Intentional duplicates in required array
                  required: ["field1", "field1", "param1"],
                  properties: {
                    field1: { type: "string" },
                    param1: { type: "string" }
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "OK" },
          },
        },
      },
    },
  };

  it("deduplicates elements in the 'required' array of the generated JSON schema", () => {
    const converter = new OpenAPIToMCPConverter(duplicateRequiredSpec);
    const { tools } = converter.convertToMCPTools();

    const method = tools.API.methods.find((m) => m.name === "testDuplicateRequired");
    expect(method).toBeDefined();
    
    const required = method!.inputSchema.required;
    expect(required).toBeDefined();
    
    // Count occurrences of each required field
    const counts = (required as string[]).reduce((acc: Record<string, number>, curr: string) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});

    expect(counts["field1"]).toBe(1);
    expect(counts["param1"]).toBe(1);
    expect((required as string[]).length).toBe(2);
  });
});
