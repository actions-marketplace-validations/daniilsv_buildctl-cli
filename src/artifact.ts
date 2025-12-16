import * as core from "@actions/core";
import * as fs from "fs/promises";
import * as path from "path";

async function getContentType(filename: string): Promise<string> {
  const ext = path.extname(filename);
  if (ext === "") {
    return "application/octet-stream";
  }

  const mimeTypes: Record<string, string> = {
    ".json": "application/json",
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".ts": "application/typescript",
    ".xml": "application/xml",
    ".zip": "application/zip",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };

  return mimeTypes[ext.toLowerCase()] || "application/octet-stream";
}

export async function uploadArtifact(
  token: string,
  backend: string,
  project: string,
  branch: string,
  commit: string,
  filePath: string
): Promise<void> {
  const file = await fs.open(filePath, "r");
  try {
    const fileStat = await file.stat();
    const filename = path.basename(filePath);

    const presignReq = {
      project_name: project,
      branch_name: branch,
      commit_hash: commit,
      filename: filename,
    };

    const presignUrl = `${backend}/api/v1/artifacts/presign`;
    const presignResponse = await fetch(presignUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(presignReq),
    });

    if (presignResponse.status !== 200) {
      const body = await presignResponse.text();
      throw new Error(
        `Presign request failed with status ${presignResponse.status}: ${body}`
      );
    }

    const presignResp = (await presignResponse.json()) as {
      upload_url: string;
      s3_key: string;
    };

    const fileBuffer = await fs.readFile(filePath);
    const uploadResponse = await fetch(presignResp.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": fileStat.size.toString(),
      },
      body: fileBuffer,
    });

    if (uploadResponse.status !== 200 && uploadResponse.status !== 204) {
      const body = await uploadResponse.text();
      throw new Error(
        `Upload failed with status ${uploadResponse.status}: ${body}`
      );
    }

    const contentType = await getContentType(filename);

    const confirmReq = {
      project_name: project,
      branch_name: branch,
      commit_hash: commit,
      s3_key: presignResp.s3_key,
      filename: filename,
      size_bytes: fileStat.size,
      content_type: contentType,
    };

    const confirmUrl = `${backend}/api/v1/artifacts/confirm`;
    const confirmResponse = await fetch(confirmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(confirmReq),
    });

    if (confirmResponse.status !== 201) {
      const body = await confirmResponse.text();
      throw new Error(
        `Confirm request failed with status ${confirmResponse.status}: ${body}`
      );
    }

    try {
      const confirmResult = (await confirmResponse.json()) as {
        public_url?: string;
      };
      if (confirmResult.public_url) {
        core.info(
          `Artifact uploaded successfully!\nS3 Key: ${presignResp.s3_key}\nPublic URL: ${confirmResult.public_url}`
        );
      } else {
        core.info(`Artifact uploaded successfully: ${presignResp.s3_key}`);
      }
    } catch {
      core.info(`Artifact uploaded successfully: ${presignResp.s3_key}`);
    }
  } finally {
    await file.close();
  }
}
