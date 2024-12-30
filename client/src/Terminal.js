import React, { useState, useEffect, useRef } from 'react';

const Terminal = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(['Welcome to Terminal Helper']);
  const [cwd, setCwd] = useState('');
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const outputRef = useRef(null);

  useEffect(() => {
    let socket = null;
    
    const connectWebSocket = () => {
      console.log('Attempting to connect to WebSocket...');
      socket = new WebSocket('ws://localhost:8081');
      
      socket.onopen = () => {
        console.log('WebSocket Connected');
        setConnected(true);
        setWs(socket);
        addOutput('Terminal connected successfully');
      };

      socket.onmessage = (event) => {
        console.log('Received message:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'output') {
            addOutput(`$ ${data.command}`);
            addOutput(data.output || 'Command completed');
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          addOutput(`Error: ${error.message}`);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket Disconnected');
        setConnected(false);
        setWs(null);
        addOutput('Terminal disconnected - attempting to reconnect...');
        setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        addOutput('Error connecting to terminal server');
      };
    };

    connectWebSocket();

    fetch('http://localhost:3001/cwd')
      .then(res => res.json())
      .then(data => {
        console.log('Got working directory:', data);
        setCwd(data.cwd || process.cwd());
        addOutput(`Current directory: ${data.cwd}`);
      })
      .catch(err => {
        console.error('Error getting working directory:', err);
        setCwd(process.cwd());
      });

    return () => {
      if (socket) {
        console.log('Cleaning up WebSocket connection');
        socket.close();
      }
    };
  }, []);

  const addOutput = (text) => {
    setOutput(prev => [...prev, text]);
    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    }, 0);
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'command',
          command,
          cwd
        }));
        addOutput(`$ ${command}`);
      } else {
        throw new Error('Terminal not connected');
      }
    } catch (error) {
      console.error('Error executing command:', error);
      addOutput(`Error: ${error.message}`);
    }

    setCommand('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ccc',
      borderRadius: '4px',
      margin: '20px',
      backgroundColor: '#1e1e1e'
    }}>
      {/* Control Panel */}
      <div style={{ 
        padding: '10px',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#252526',
        color: '#fff'
      }}>
        {/* Status Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <span>Terminal</span>
          <span>
            <span style={{
              height: '8px',
              width: '8px',
              borderRadius: '50%',
              display: 'inline-block',
              backgroundColor: connected ? '#4CAF50' : '#f44336',
              marginRight: '8px'
            }}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Button Row */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                addOutput('Starting servers...');
                ws.send(JSON.stringify({
                  type: 'command',
                  command: 'start-servers',
                  cwd
                }));
              }
            }}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Start Servers
          </button>

          <button
            onClick={() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                addOutput('Stopping servers...');
                ws.send(JSON.stringify({
                  type: 'command',
                  command: 'stop-servers',
                  cwd
                }));
              }
            }}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Stop Servers
          </button>

          <button
            onClick={() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                addOutput('Restarting servers...');
                ws.send(JSON.stringify({
                  type: 'command',
                  command: 'restart-servers',
                  cwd
                }));
              }
            }}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Restart Servers
          </button>

          <button
            onClick={() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                addOutput('Starting Firebase deployment...');
                ws.send(JSON.stringify({
                  type: 'command',
                  command: 'firebase-deploy',
                  cwd
                }));
              }
            }}
            style={{
              backgroundColor: '#FFA000',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Deploy to Firebase
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div 
        ref={outputRef}
        style={{
          height: '300px',
          overflow: 'auto',
          padding: '10px',
          backgroundColor: '#1e1e1e',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}
      >
        {output.map((line, i) => (
          <div key={i} style={{ 
            whiteSpace: 'pre-wrap',
            marginBottom: '5px'
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* Command Input */}
      <div style={{
        padding: '10px',
        borderTop: '1px solid #333',
        display: 'flex',
        backgroundColor: '#1e1e1e'
      }}>
        <span style={{ color: '#4CAF50', marginRight: '8px', fontFamily: 'monospace' }}>
          {cwd}$
        </span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            flex: 1,
            backgroundColor: '#1e1e1e',
            border: 'none',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '14px',
            outline: 'none'
          }}
          placeholder="Enter command..."
        />
      </div>
    </div>
  );
};

export default Terminal;