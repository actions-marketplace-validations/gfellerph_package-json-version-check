const { setOutput, setFailed } = require("@actions/core");
const github = require("@actions/github");

const getPackageJson = async (ref, octokit) => {
  const packageJSONData = (
    await octokit.repos.getContents({
      ...github.context.repo,
      path: process.env["INPUT_PATH"] || "package.json",
      ref,
    })
  ).data.content;
  if (!packageJSONData) {
    throw new Error(`Could not find package.json for commit ${ref}`);
  }
  return JSON.parse(Buffer.from(packageJSONData, "base64").toString());
};

const run = async () => {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    throw new Error("GITHUB_TOKEN not provided");
  }

  const octokit = github.getOctokit(token);
  const currentRef = github.context.sha;
  const previousRef = (
    (
      await octokit.repos.getCommit({
        ...github.context.repo,
        ref: currentRef,
      })
    ).data.parents[0] || {}
  ).sha;

  const currentPackageJSON = await getPackageJson(currentRef, octokit);
  setOutput("current-package-version", currentPackageJSON.version);

  if (!previousRef) {
    setOutput("has-updated", true);
    return;
  }

  const previousPackageJSON = await getPackageJson(previousRef, octokit);
  setOutput(
    "has-updated",
    currentPackageJSON.version !== previousPackageJSON.version
  );
};

run().catch((error) => {
  setFailed(error.message);
});
