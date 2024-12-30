const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {SecretManagerServiceClient} = require("@google-cloud/secret-manager");
const {Octokit} = require("@octokit/rest");

admin.initializeApp();

// Initialize Secret Manager
const secretManager = new SecretManagerServiceClient();

/**
 * Retrieves GitHub token from Secret Manager
 * @return {Promise<string>} The GitHub token
 */
async function getGithubToken() {
  const [version] = await secretManager.accessSecretVersion({
    name: "projects/deploy-jstarr/secrets/GITHUB_TOKEN/versions/latest",
  });
  return version.payload.data.toString();
}

exports.testGithubAuth = functions.https.onCall(async (data, context) => {
  try {
    // Get the token from Secret Manager
    const token = await getGithubToken();

    // Initialize Octokit with the token
    const octokit = new Octokit({auth: token});

    // Test the connection by getting the authenticated user
    const {data: user} = await octokit.rest.users.getAuthenticated();

    return {
      success: true,
      message: `Successfully authenticated with GitHub as ${user.login}`,
      username: user.login,
    };
  } catch (error) {
    console.error("GitHub authentication error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.processCode = functions.https.onCall(async (data, context) => {
  try {
    const {code, fileName, path} = data;

    // Get GitHub token
    const token = await getGithubToken();
    const octokit = new Octokit({auth: token});

    // Create or update file in GitHub
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner: "jstarr", // Replace with your GitHub username
      repo: "deploy-jstarr",
      path: path,
      message: `Update ${fileName} via Deploy Helper`,
      content: Buffer.from(code).toString("base64"),
      branch: "main",
    });

    return {
      success: true,
      message: `File ${fileName} processed successfully`,
      sha: response.data.content.sha,
    };
  } catch (error) {
    console.error("Error processing code:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
