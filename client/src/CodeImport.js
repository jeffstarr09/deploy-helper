import React, { useState } from 'react';
import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

const CodeImport = () => {
  const [code, setCode] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const analyzeCode = (content) => {
    let fileType = 'unknown';
    let fileName = 'unknown';
    let path = '';

    if (content.includes('<html>')) {
      fileType = 'HTML';
      if (content.includes('game')) {
        fileName = 'game.html';
        path = 'html/game.html';
      } else if (content.includes('admin')) {
        fileName = 'admin.html';
        path = 'html/admin.html';
      }
    } else if (content.includes('import React')) {
      fileType = 'React Component';
      // Look for component name in different patterns
      let componentName = null;
      
      // Check for const ComponentName = () => pattern
      const constMatch = content.match(/const\s+([A-Z][a-zA-Z0-9]*)\s*=/);
      if (constMatch) {
        componentName = constMatch[1];
      }
      
      // Check for export default ComponentName pattern
      const exportMatch = content.match(/export\s+default\s+([A-Z][a-zA-Z0-9]*)/);
      if (exportMatch) {
        componentName = exportMatch[1];
      }

      if (componentName) {
        fileName = `${componentName}.js`;
        path = `components/${fileName}`;
      }
    }

    return {
      fileType,
      fileName,
      path,
      requiresServerRestart: fileType === 'React Component'
    };
  };

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (newCode.trim()) {
      const analysis = analyzeCode(newCode);
      console.log('Code Analysis:', analysis);
      setAnalysis(analysis);
    } else {
      setAnalysis(null);
    }
    setStatus('');
  };

  const handleProcess = async () => {
    if (!code.trim() || !analysis) return;

    try {
      setIsProcessing(true);
      setStatus('Processing code...');
      
      console.log('Sending data to Firebase:', {
        fileName: analysis.fileName,
        path: analysis.path,
        codeLength: code.length
      });

      const processCode = httpsCallable(functions, 'processCode');
      const result = await processCode({
        code: code,
        fileName: analysis.fileName,
        path: analysis.path
      });

      console.log('Firebase response:', result.data);
      
      if (result.data.success) {
        setCode('');
        setAnalysis(null);
        setStatus('Code processed successfully!');
      } else {
        throw new Error(result.data.message || 'Failed to process code');
      }
    } catch (error) {
      console.error('Error processing code:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ccc',
      borderRadius: '4px',
      backgroundColor: '#1e1e1e',
      height: '100%'
    }}>
      <div style={{ 
        padding: '10px',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#252526',
        color: '#fff'
      }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>Code Import</h2>
      </div>

      <div style={{ padding: '15px' }}>
        <textarea
          value={code}
          onChange={handleCodeChange}
          placeholder="Paste your code here..."
          style={{
            width: '100%',
            height: '300px',
            backgroundColor: '#2d2d2d',
            border: '1px solid #404040',
            borderRadius: '4px',
            padding: '10px',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />

        {analysis && (
          <div style={{ 
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#2d2d2d',
            borderRadius: '4px',
            color: '#fff'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Analysis</h3>
            <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
              <p>File Type: <span style={{ color: '#4CAF50' }}>{analysis.fileType}</span></p>
              <p>File Name: <span style={{ color: '#4CAF50' }}>{analysis.fileName}</span></p>
              <p>Path: <span style={{ color: '#4CAF50' }}>{analysis.path}</span></p>
            </div>
          </div>
        )}

        {status && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: status.includes('Error') ? '#ff5252' : '#4CAF50',
            color: 'white',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {status}
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={!code.trim() || !analysis || isProcessing}
          style={{
            marginTop: '15px',
            backgroundColor: (code.trim() && analysis && !isProcessing) ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: (code.trim() && analysis && !isProcessing) ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            width: '100%'
          }}
        >
          {isProcessing ? 'Processing...' : 'Process Code'}
        </button>
      </div>
    </div>
  );
};

export default CodeImport;