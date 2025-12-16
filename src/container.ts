import * as core from "@actions/core";
import * as fs from "fs/promises";
import * as path from "path";

function parseImageTag(image: string): { imageName: string; imageTag: string } {
  let imageName = image;
  let imageTag = "latest";

  const lastSlash = image.lastIndexOf("/");
  const searchStart = lastSlash >= 0 ? lastSlash + 1 : 0;

  const colonIndex = image.lastIndexOf(":");
  if (colonIndex > searchStart) {
    imageName = image.substring(0, colonIndex);
    imageTag = image.substring(colonIndex + 1);
  }

  return { imageName, imageTag };
}

export async function registerContainer(
  token: string,
  backend: string,
  project: string,
  branch: string,
  commit: string,
  image: string,
  digest: string
): Promise<void> {
  const { imageName, imageTag } = parseImageTag(image);

  const registerReq: Record<string, unknown> = {
    project_name: project,
    branch_name: branch,
    commit_hash: commit,
    image_name: imageName,
    image_tag: imageTag,
    image_digest: digest,
  };

  const registerUrl = `${backend}/api/v1/artifacts/container`;
  const registerResponse = await fetch(registerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(registerReq),
  });

  if (registerResponse.status !== 201) {
    const body = await registerResponse.text();
    throw new Error(
      `Register request failed with status ${registerResponse.status}: ${body}`
    );
  }

  try {
    const registerResult = (await registerResponse.json()) as {
      public_url: string;
    };
    if (registerResult.public_url) {
      core.info(
        `Container image registered successfully!\nImage: ${image}\nDigest: ${digest}\nPublic URL: ${registerResult.public_url}`
      );
    } else {
      core.info(
        `Container image registered successfully!\nImage: ${image}\nDigest: ${digest}`
      );
    }
  } catch {
    core.info(
      `Container image registered successfully!\nImage: ${image}\nDigest: ${digest}`
    );
  }
}
