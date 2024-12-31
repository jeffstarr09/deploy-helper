const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {SecretManagerServiceClient} = require("@google-cloud/secret-manager");
const {Octokit} = require("@octokit/rest");

admin.initializeApp();

// Initialize Secret Manager
const secretManager = new SecretManagerServiceClient();

async function getGithubToken() {
  try {
    const [version] = await secretManager.accessSecretVersion({
      name: "projects/deploy-jstarr/secrets/GITHUB_TOKEN/versions/latest",
    });
    return version.payload.data.toString();
  } catch (error) {
    console.error('Error getting GitHub token:', error);
    throw error;
  }
}

exports.processCode = functions.https.onCall(async (data, context) => {
  try {
    console.log('Received data:', JSON.stringify(data));
    
    if (!data || !data.code) {
      throw new Error('No code provided');
    }

    const { code, fileName, path } = data;
    console.log(`Processing file: ${fileName} at path: ${path}`);
    
    // Get GitHub token
    const token = await getGithubToken();
    console.log('Got GitHub token');
    
    const octokit = new Octokit({ auth: token });

    // Create or update file in GitHub
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner: "jstarr",  // Replace with your GitHub username
      repo: "deploy-helper",
      path: path,
      message: `Update ${fileName} via Deploy Helper`,
      content: Buffer.from(code).toString('base64'),
      branch: "main"
    });

    console.log('GitHub API Response:', JSON.stringify(response.data));

    return {
      success: true,
      message: `File ${fileName} processed successfully`,
      sha: response.data.content.sha
    };
  } catch (error) {
    console.error('Error in processCode:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});