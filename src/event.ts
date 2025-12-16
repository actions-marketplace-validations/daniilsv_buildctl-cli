import * as core from "@actions/core";

const VALID_STATUSES = [
  "queued",
  "started",
  "in_progress",
  "success",
  "failed",
  "cancelled",
];

export async function sendEvent(
  token: string,
  backend: string,
  project: string,
  branch: string,
  commit: string,
  status: string,
  log?: string
): Promise<void> {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(", ")}`
    );
  }

  const payload: Record<string, string> = {
    project_name: project,
    commit_hash: commit,
    branch: branch,
    status: status,
  };

  if (log) {
    payload.log = log;
  }

  const url = `${backend}/api/v1/events`;
  let lastError: Error | null = null;

  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 202) {
        core.info("Event sent successfully");
        return;
      }

      const body = await response.text();
      lastError = new Error(
        `Request failed with status ${response.status}: ${body}`
      );

      if (i < 2) {
        await new Promise((resolve) => setTimeout(resolve, (i + 1) * 1000));
      }
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(`Failed to send request: ${String(error)}`);
      if (i < 2) {
        await new Promise((resolve) => setTimeout(resolve, (i + 1) * 1000));
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
}

