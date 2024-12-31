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
    throw new functions.https.HttpsError('internal', 'Failed to get GitHub token: ' + error.message);
  }
}

exports.processCode = functions.https.onCall(async (data, context) => {
  try {
    // Log received data
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    // Validate input
    if (!data) {
      throw new functions.https.HttpsError('invalid-argument', 'No data provided');
    }
    
    if (!data.code) {
      throw new functions.https.HttpsError('invalid-argument', 'No code provided');
    }
    
    if (!data.fileName) {
      throw new functions.https.HttpsError('invalid-argument', 'No fileName provided');
    }
    
    if (!data.path) {
      throw new functions.https.HttpsError('invalid-argument', 'No path provided');
    }

    // Get GitHub token
    const token = await getGithubToken();
    console.log('Successfully got GitHub token');

    // Initialize Octokit
    const octokit = new Octokit({
      auth: token
    });

    try {
      // Try to get the file first to check if it exists
      let existingFile;
      try {
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner: "jstarr",
          repo: "deploy-helper",
          path: data.path,
          ref: "main"
        });
        existingFile = fileData;
      } catch (e) {
        // File doesn't exist, which is fine
        console.log('File does not exist yet, will create new one');
      }

      // Create or update the file
      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner: "jstarr",
        repo: "deploy-helper",
        path: data.path,
        message: `Update ${data.fileName} via Deploy Helper`,
        content: Buffer.from(data.code).toString('base64'),
        branch: "main",
        ...(existingFile && { sha: existingFile.sha })
      });

      console.log('GitHub API Response:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        message: `File ${data.fileName} processed successfully`,
        sha: response.data.content.sha
      };
    } catch (gitError) {
      console.error('GitHub API Error:', gitError);
      throw new functions.https.HttpsError('aborted', 'GitHub API Error: ' + gitError.message);
    }
  } catch (error) {
    console.error('Error in processCode:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});