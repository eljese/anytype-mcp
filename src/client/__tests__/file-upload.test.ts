import FormData from "form-data";
import fs from "fs";
import { OpenAPIV3 } from "openapi-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "../http-client";

vi.mock("fs");
vi.mock("form-data");

describe("HttpClient File Upload (Streaming)", () => {
  let client: HttpClient;
  const mockApiInstance = {
    create_file: vi.fn(),
  };

  const baseConfig = {
    baseUrl: "http://test.com",
    headers: {},
  };

  const mockOpenApiSpec: OpenAPIV3.Document = {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
    paths: {
      "/v1/spaces/{space_id}": {
        patch: {
          operationId: "create_file",
          parameters: [
            {
              name: "space_id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "File uploaded successfully",
            },
          },
          requestBody: {
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                    },
                    space_id: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new HttpClient(baseConfig, mockOpenApiSpec);
    // @ts-expect-error - Mock the private api property
    client["api"] = Promise.resolve(mockApiInstance);
    // Ensure prototype methods are spy-able on the real prototype
    vi.spyOn(FormData.prototype as any, "append").mockImplementation(() => {
      return undefined;
    });
    vi.spyOn(FormData.prototype as any, "getHeaders").mockReturnValue({});
  });

  it("should stream a local file to the Anytype API", async () => {
    const mockFileStream = { pipe: vi.fn(), on: vi.fn() };
    const mockFormDataHeaders = { "content-type": "multipart/form-data; boundary=---123" };

    vi.mocked(fs.createReadStream).mockReturnValue(mockFileStream as any);
    vi.mocked(FormData.prototype.getHeaders).mockReturnValue(mockFormDataHeaders);

    const operation = mockOpenApiSpec.paths["/v1/spaces/{space_id}"]!.patch as any;
    const params = {
      file: "/abs/path/to/image.png",
      space_id: "space123",
    };

    mockApiInstance.create_file.mockResolvedValue({
      data: { fileId: "file_xyz" },
      status: 200,
      headers: {},
    });

    const response = await client.executeOperation(operation, params);

    expect(fs.createReadStream).toHaveBeenCalledWith("/abs/path/to/image.png");
    expect(FormData.prototype.append).toHaveBeenCalledWith("file", mockFileStream);
    expect(mockApiInstance.create_file).toHaveBeenCalledWith(
      expect.objectContaining({ space_id: "space123" }),
      expect.any(FormData),
      expect.objectContaining({ headers: mockFormDataHeaders })
    );
    expect(response.data).toEqual({ fileId: "file_xyz" });
  });

  it("should verify error handling for non-existent files", async () => {
    vi.mocked(fs.createReadStream).mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const operation = mockOpenApiSpec.paths["/v1/spaces/{space_id}"]!.patch as any;
    const params = {
      file: "/non/existent.txt",
      space_id: "space123",
    };

    await expect(client.executeOperation(operation, params)).rejects.toThrow(
      "Failed to read file at /non/existent.txt"
    );
  });
});
