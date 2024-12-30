const express = require('express');
const { exec, spawn } = require('child_process');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Enable CORS with updated configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));  // Increased limit for larger code files

// Server process tracking
let frontendProcess = null;
let backendProcess = null;

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: 8081 });

// Store active terminal sessions
const terminals = new Map();

// Server management functions
const startFrontend = () => {
    if (frontendProcess) return 'Frontend server is already running';
    
    frontendProcess = spawn('npm', ['start'], {
        cwd: './client',
        stdio: 'pipe',
        shell: true
    });

    frontendProcess.stdout.on('data', (data) => {
        console.log(`Frontend: ${data}`);
    });

    frontendProcess.stderr.on('data', (data) => {
        console.error(`Frontend error: ${data}`);
    });

    return 'Frontend server started';
};

const startBackend = () => {
    if (backendProcess) return 'Backend server is already running';
    
    backendProcess = spawn('node', ['server/index.js'], {
        cwd: '.',
        stdio: 'pipe',
        shell: true
    });

    backendProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
        console.error(`Backend error: ${data}`);
    });

    return 'Backend server started';
};

const stopServers = () => {
    if (frontendProcess) {
        frontendProcess.kill();
        frontendProcess = null;
    }
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }
    return 'All servers stopped';
};

// Server-side code processing functions
const processCode = async (code, fileName, targetPath) => {
    try {
        console.log('Processing code:', { fileName, targetPath });
        // Resolve the full path relative to the project root
        const fullPath = path.join(__dirname, '..', targetPath);
        console.log('Full path:', fullPath);
        
        // Ensure the directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        // Write the file
        await fs.writeFile(fullPath, code);
        console.log('File written successfully');
        return true;
    } catch (error) {
        console.error('Error processing code:', error);
        return false;
    }
};

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New terminal connection established');
    
    const sessionId = Date.now().toString();
    terminals.set(sessionId, ws);

    // Send initial connection confirmation
    ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'Terminal connected successfully'
    }));

    // Handle incoming messages
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received command:', data.command);

            if (data.type === 'command') {
                switch(data.command) {
                    case 'start-servers':
                        const frontendStatus = startFrontend();
                        const backendStatus = startBackend();
                        ws.send(JSON.stringify({
                            type: 'output',
                            output: `${frontendStatus}\n${backendStatus}`,
                            command: data.command
                        }));
                        break;
                        
                    case 'stop-servers':
                        const status = stopServers();
                        ws.send(JSON.stringify({
                            type: 'output',
                            output: status,
                            command: data.command
                        }));
                        break;
                        
                    case 'restart-servers':
                        stopServers();
                        setTimeout(() => {
                            const fStatus = startFrontend();
                            const bStatus = startBackend();
                            ws.send(JSON.stringify({
                                type: 'output',
                                output: `Servers restarted\n${fStatus}\n${bStatus}`,
                                command: data.command
                            }));
                        }, 2000);
                        break;

                    case 'firebase-deploy':
                        console.log('Starting Firebase deployment...');
                        exec('firebase deploy', {
                            cwd: data.cwd || process.cwd()
                        }, (error, stdout, stderr) => {
                            ws.send(JSON.stringify({
                                type: 'output',
                                output: stdout || stderr,
                                error: error ? error.message : null,
                                command: 'firebase deploy'
                            }));
                        });
                        break;

                    default:
                        exec(data.command, {
                            cwd: data.cwd || process.cwd()
                        }, (error, stdout, stderr) => {
                            ws.send(JSON.stringify({
                                type: 'output',
                                output: stdout || stderr,
                                error: error ? error.message : null,
                                command: data.command
                            }));
                        });
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process command'
            }));
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        console.log('Client disconnected:', sessionId);
        terminals.delete(sessionId);
    });
});

// REST endpoint to get current working directory
app.get('/cwd', (req, res) => {
    res.json({
        cwd: process.cwd(),
        message: 'Current working directory retrieved'
    });
});

// REST endpoint to change directory
app.post('/cd', (req, res) => {
    const { path } = req.body;
    try {
        process.chdir(path);
        res.json({
            success: true,
            cwd: process.cwd(),
            message: `Changed directory to ${process.cwd()}`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Add new endpoint for processing code with debug logging
app.post('/process-code', async (req, res) => {
    console.log('Received process-code request');
    console.log('Request body:', req.body);
    
    const { code, fileName, path: targetPath, requiresServerRestart } = req.body;
    
    try {
        // Notify all connected terminals of the process starting
        wss.clients.forEach(client => {
            client.send(JSON.stringify({
                type: 'output',
                output: `Processing ${fileName}...`
            }));
        });

        // Stop servers if needed
        if (requiresServerRestart) {
            wss.clients.forEach(client => {
                client.send(JSON.stringify({
                    type: 'output',
                    output: 'Stopping servers for file update...'
                }));
            });
            stopServers();
        }

        // Process the code
        const success = await processCode(code, fileName, targetPath);

        if (success) {
            // Restart servers if needed
            if (requiresServerRestart) {
                setTimeout(() => {
                    wss.clients.forEach(client => {
                        client.send(JSON.stringify({
                            type: 'output',
                            output: 'Restarting servers...'
                        }));
                    });
                    const fStatus = startFrontend();
                    const bStatus = startBackend();
                }, 2000);
            }

            wss.clients.forEach(client => {
                client.send(JSON.stringify({
                    type: 'output',
                    output: `Successfully processed ${fileName}`
                }));
            });

            res.json({ success: true, message: 'Code processed successfully' });
        } else {
            throw new Error('Failed to process code');
        }
    } catch (error) {
        console.error('Error in /process-code:', error);
        wss.clients.forEach(client => {
            client.send(JSON.stringify({
                type: 'output',
                output: `Error processing ${fileName}: ${error.message}`
            }));
        });
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Terminal server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:8081`);
});