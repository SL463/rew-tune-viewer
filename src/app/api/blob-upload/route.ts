import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

// Generates a client token so the browser can upload the raw .mdat directly to
// Blob (bypassing the serverless request body size limit). This route is behind
// Basic Auth via middleware.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/octet-stream",
          "application/x-binary",
          "application/vnd.rar",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: 200 * 1024 * 1024,
        tokenPayload: null,
      }),
      onUploadCompleted: async () => {
        // Processing is triggered explicitly by the client via /api/process.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
