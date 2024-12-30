import * as vscode from 'vscode';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as fs from 'fs';
import * as path from 'path';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAzZC1pfuzhz4UukgHpdaRn9FDQ121sTWw",
    authDomain: "deploy-jstarr.firebaseapp.com",
    projectId: "deploy-jstarr",
    storageBucket: "deploy-jstarr.firebasestorage.app",
    messagingSenderId: "18328278841",
    appId: "1:18328278841:web:3cbe4c8d2cb9fd792fbae8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const functions = getFunctions(app);

// Define types for our data
interface CodeUpdate {
    code: string;
    path: string;
}

interface UpdateResponse {
    message: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Deploy Helper extension is now active');

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = "$(cloud) Deploy Helper Connected";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register command to process incoming code
    let processCodeCommand = vscode.commands.registerCommand('deploy-helper.processCode', async () => {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder found');
            }

            // Listen for code updates from Firebase
            const codeUpdatesRef = ref(db, 'codeUpdates');
            onValue(codeUpdatesRef, async (snapshot) => {
                const data = snapshot.val() as CodeUpdate;
                if (data && data.code) {
                    try {
                        // Get the workspace path
                        const workspacePath = workspaceFolders[0].uri.fsPath;
                        
                        // Create file path
                        const filePath = path.join(workspacePath, data.path);
                        
                        // Ensure directory exists
                        const directory = path.dirname(filePath);
                        if (!fs.existsSync(directory)) {
                            fs.mkdirSync(directory, { recursive: true });
                        }

                        // Write the file
                        fs.writeFileSync(filePath, data.code);

                        // Show success message
                        vscode.window.showInformationMessage(
                            `Successfully updated ${data.path}`
                        );

                        // Open the file in editor
                        const document = await vscode.workspace.openTextDocument(filePath);
                        await vscode.window.showTextDocument(document);

                    } catch (error) {
                        vscode.window.showErrorMessage(
                            `Error processing code: ${error}`
                        );
                    }
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });

    // Register command to manually check for updates
    let checkUpdatesCommand = vscode.commands.registerCommand('deploy-helper.checkUpdates', async () => {
        try {
            const checkUpdates = httpsCallable(functions, 'checkForUpdates');
            const result = await checkUpdates();
            
            // Type assertion for the response
            const response = result.data as UpdateResponse;
            
            vscode.window.showInformationMessage(
                `Checked for updates: ${response.message}`
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `Error checking for updates: ${error}`
            );
        }
    });

    // Register command to show connection status
    let showStatusCommand = vscode.commands.registerCommand('deploy-helper.showStatus', () => {
        vscode.window.showInformationMessage(
            'Deploy Helper is connected and monitoring for updates'
        );
    });

    context.subscriptions.push(processCodeCommand);
    context.subscriptions.push(checkUpdatesCommand);
    context.subscriptions.push(showStatusCommand);

    // Start monitoring for code updates automatically
    vscode.commands.executeCommand('deploy-helper.processCode');
}

export function deactivate() {
    // Cleanup code here
    console.log('Deploy Helper extension is now deactivated');
}