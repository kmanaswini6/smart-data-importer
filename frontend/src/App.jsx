import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import UploadView from './components/UploadView';
import MappingReview from './MappingReview';
import AuditResults from './components/AuditResults';
import { TOKENS } from './components/LedgerPrimitives';
import { AuthContext } from './context/AuthContext';
import Login from './components/Login';

export default function App() {
  const { token, logout } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState('upload');
  const [history, setHistory] = useState([]);
  const [activeUpload, setActiveUpload] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [errorAlert, setErrorAlert] = useState('');

  useEffect(() => {
    if (token) {
      loadHistoryLog();
    }
  }, [token]);

  const loadHistoryLog = async () => {
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:5000/api/imports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (err) {
      setErrorAlert('Unable to sync system historical ingestion registers.');
    }
  };

  const handleInitialUpload = async (file) => {
    const data = new FormData();
    data.append('file', file);
    setErrorAlert('');
    try {
      // Post directly to the backend; all headers and AI mappings are prepared server-side
      const res = await axios.post('http://localhost:5000/api/import/upload', data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveUpload(res.data);
      setViewMode('mapping');
    } catch (err) {
      setErrorAlert(err.response?.data?.error || 'CSV Ingestion transmission link error.');
    }
  };

  const handleMappingConfirm = async (userSchemaMap) => {
    setErrorAlert('');
    try {
      await axios.post(`http://localhost:5000/api/import/${activeUpload.importId}/process`, {
        mapping: userSchemaMap,
        filePath: activeUpload.filePath
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const report = await axios.get(`http://localhost:5000/api/import/${activeUpload.importId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveReport(report.data);
      setViewMode('results');
      loadHistoryLog();
    } catch (err) {
      setErrorAlert(err.response?.data?.error || 'Data synchronization failed during transaction commit stages.');
    }
  };

  const handleInspectReport = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/import/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveReport(res.data);
      setViewMode('results');
    } catch (err) {
      setErrorAlert('Could not read specified historical audit metrics.');
    }
  };

  if (!token) {
    return <Login />;
  }

  const baseCanvasStyle = {
    backgroundColor: TOKENS.bgStone,
    backgroundImage: 'radial-gradient(#221F1D 1px, transparent 1px)',
    backgroundSize: '16px 16px',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: TOKENS.inkCharcoal,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  };

  const innerWrapperStyle = {
    width: '100%',
    maxWidth: '1060px',
    margin: '40px auto',
    border: `1px solid ${TOKENS.inkCharcoal}`,
    padding: '36px',
    backgroundColor: TOKENS.bgStone,
    borderRadius: '2px',
    boxSizing: 'border-box'
  };

  return (
    <div style={baseCanvasStyle}>
      <style>{`
        .ledger-row-hover:hover {
          background-color: ${TOKENS.bgHover} !important;
        }
      `}</style>

      <div style={{
        fontFamily: '"JetBrains Mono", monospace',
        backgroundColor: '#221F1D',
        color: '#EDEBE6',
        padding: '8px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px'
      }}>
        <span>TENANT_STATUS: ACTIVE_NODE</span>
        <button
          onClick={() => {
            logout();
            setViewMode('upload');
          }}
          style={{
            backgroundColor: 'transparent',
            color: '#EDEBE6',
            border: '1px solid #EDEBE6',
            padding: '2px 8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '11px',
            borderRadius: '2px'
          }}
        >
          DISCONNECT_SESSION
        </button>
      </div>

      <div style={{ padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={innerWrapperStyle}>
          {errorAlert && (
            <div style={{
              backgroundColor: TOKENS.accentBrick,
              color: TOKENS.bgStone,
              padding: '12px',
              fontSize: '13px',
              fontFamily: '"JetBrains Mono", monospace',
              marginBottom: '24px',
              borderRadius: '2px',
              fontWeight: '700'
            }}>
              [SYSTEM FAULT]: {errorAlert}
            </div>
          )}

          {viewMode === 'upload' && (
            <UploadView
              history={history}
              onUpload={handleInitialUpload}
              onSelectHistory={handleInspectReport}
            />
          )}

          {viewMode === 'mapping' && activeUpload && (
            <MappingReview
              mappings={activeUpload.mappings}
              onConfirm={handleMappingConfirm}
            />
          )}

          {viewMode === 'results' && activeReport && (
            <AuditResults
              reportData={activeReport}
              onBack={() => setViewMode('upload')}
            />
          )}
        </div>
      </div>
    </div>
  );
}