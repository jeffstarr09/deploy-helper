import React, { useEffect } from 'react';
import Terminal from './Terminal';
import CodeImport from './CodeImport';
import DebugPanel from './DebugPanel';
import './App.css';

function App() {
  useEffect(() => {
    // Set up console log capture
    if (!window._consoleLogs) {
      window._consoleLogs = [];
      const originalConsole = { ...console };
      
      // Wrap console methods
      ['log', 'error', 'warn', 'info'].forEach(method => {
        console[method] = (...args) => {
          // Call original method
          originalConsole[method](...args);
          
          // Store in our log array
          window._consoleLogs.push({
            type: method,
            timestamp: new Date().toISOString(),
            message: args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ')
          });
          
          // Keep only last 50 logs
          if (window._consoleLogs.length > 50) {
            window._consoleLogs.shift();
          }
        };
      });
    }
  }, []);

  return (
    <div className="App">
      <header style={{ 
        padding: '10px', 
        backgroundColor: '#1e1e1e', 
        color: 'white' 
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Deploy Helper</h1>
      </header>
      <main style={{ 
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <DebugPanel />
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          <CodeImport />
          <Terminal />
        </div>
      </main>
    </div>
  );
}

export default App;