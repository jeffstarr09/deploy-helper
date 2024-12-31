import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, onValue, push, serverTimestamp } from 'firebase/database';
import { app } from './firebase';

const Terminal = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(['Welcome to Deploy Helper']);
  const [connected, setConnected] = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    try {
      const db = getDatabase(app);
      const terminalRef = ref(db, 'terminal');
      
      setConnected(true);
      
      const unsubscribe = onValue(terminalRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.messages) {
          const messages = Object.values(data.messages)
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(m => m.text);
          setOutput(messages.slice(-50)); // Keep last 50 messages
        }
      });

      return () => {
        unsubscribe();
        setConnected(false);
      };
    } catch (error) {
      console.error('Database connection error:', error);
      setConnected(false);
    }
  }, []);

  const addOutput = async (text) => {
    try {
      const db = getDatabase(app);
      const messagesRef = ref(db, 'terminal/messages');
      await push(messagesRef, {
        text,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding output:', error);
      setOutput(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    try {
      await addOutput(`$ ${command}`);
      // Command execution logic will be added here
      setCommand('');
    } catch (error) {
      console.error('Command execution error:', error);
      await addOutput(`Error: ${error.message}`);
    }
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
      backgroundColor: '#1e1e1e',
      height: '100%'
    }}>
      {/* Status Bar */}
      <div style={{ 
        padding: '10px',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#252526',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
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
          {connected ? 'Connected to Firebase' : 'Disconnected'}
        </span>
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
        <span style={{ color: '#4CAF50', marginRight: '8px', fontFamily: 'monospace' }}>$</span>
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