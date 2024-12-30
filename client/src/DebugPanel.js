import React, { useState } from 'react';
import { functions } from './firebase';

const DebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState(null);

  const collectDebugInfo = async () => {
    // Collect all relevant info
    const info = {
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      },
      firebase: {
        functionsAvailable: !!functions,
        functionRegion: functions ? functions.region : 'unknown'
      },
      localStorage: {
        available: !!window.localStorage,
        items: { ...localStorage }
      },
      console: {
        // Get last 50 console logs if available
        logs: window._consoleLogs || []
      },
      networkStatus: {
        online: navigator.onLine,
        connection: navigator.connection ? {
          type: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink
        } : 'unknown'
      }
    };

    setDebugInfo(info);

    // Create downloadable file
    const blob = new Blob([JSON.stringify(info, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-info-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (debugInfo) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
        alert('Debug info copied to clipboard!');
      } catch (err) {
        alert('Failed to copy to clipboard: ' + err.message);
      }
    }
  };

  return (
    <div style={{
      padding: '10px',
      backgroundColor: '#2d2d2d',
      borderRadius: '4px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <h3 style={{ 
          margin: 0, 
          color: '#fff',
          fontSize: '16px'
        }}>Debug Tools</h3>
        <button
          onClick={collectDebugInfo}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Collect Debug Info
        </button>
      </div>

      {debugInfo && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={copyToClipboard}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginRight: '10px'
            }}
          >
            Copy to Clipboard
          </button>
          <pre style={{
            backgroundColor: '#1e1e1e',
            padding: '10px',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            maxHeight: '200px',
            overflow: 'auto',
            marginTop: '10px'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;