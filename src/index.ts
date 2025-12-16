import * as core from "@actions/core";
import { sendEvent } from "./event";
import { uploadArtifact } from "./artifact";
import { registerContainer } from "./container";

async function run(): Promise<void> {
  try {
    const action = core.getInput("action", { required: true });
    const token = core.getInput("token", { required: true });
    const backend = core.getInput("backend", { required: true });
    const project = core.getInput("project", { required: true });
    const branch = core.getInput("branch", { required: true });
    const commit = core.getInput("commit", { required: true });

    switch (action) {
      case "event": {
        const status = core.getInput("status", { required: true });
        const log = core.getInput("log");
        await sendEvent(token, backend, project, branch, commit, status, log);
        break;
      }
      case "artifact": {
        const file = core.getInput("file", { required: true });
        await uploadArtifact(token, backend, project, branch, commit, file);
        break;
      }
      case "container": {
        const image = core.getInput("image", { required: true });
        const digest = core.getInput("digest", { required: true });
        const file = core.getInput("file");
        await registerContainer(
          token,
          backend,
          project,
          branch,
          commit,
          image,
          digest,
        );
        break;
      }
      default:
        core.setFailed(
          `Invalid action '${action}'. Must be one of: event, artifact, container`
        );
        return;
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

run();

