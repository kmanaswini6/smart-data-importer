import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadView from './components/UploadView';
import MappingReview from './MappingReview';
import AuditResults from './components/AuditResults';
import { TOKENS } from './components/LedgerPrimitives';

export default function App() {
  const [viewMode, setViewMode] = useState('upload');
  const [history, setHistory] = useState([]);
  const [activeUpload, setActiveUpload] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [errorAlert, setErrorAlert] = useState('');

  useEffect(() => {
    loadHistoryLog();
  }, []);

  const loadHistoryLog = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/imports');
      setHistory(res.data);
    } catch (err) {
      setErrorAlert('Unable to sync system historical ingestion registers.');
    }
  };

  const handleInitialUpload = async (file) => {
    const data = new FormData();
    data.append('csvFile', file);
    setErrorAlert('');
    try {
      const res = await axios.post('http://localhost:5000/api/upload', data);
      setActiveUpload(res.data);
      setViewMode('mapping');
    } catch (err) {
      setErrorAlert(err.response?.data?.error || 'CSV Ingestion transmission link error.');
    }
  };

  const handleMappingConfirm = async (userSchemaMap) => {
    setErrorAlert('');
    try {
      // 1. Instruct the backend to parse the file completely and validate it against the confirmed mapping schema
      await axios.post(`http://localhost:5000/api/imports/${activeUpload.importId}/process`, {
        mapping: userSchemaMap,
        filePath: activeUpload.filePath
      });

      // 2. Fetch the newly compiled transaction report details from the database
      const report = await axios.get(`http://localhost:5000/api/imports/${activeUpload.importId}`);
      setActiveReport(report.data);
      setViewMode('results');
      loadHistoryLog();
    } catch (err) {
      setErrorAlert(err.response?.data?.error || 'Data synchronization failed during transaction commit stages.');
    }
  };

  const handleInspectReport = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/imports/${id}`);
      setActiveReport(res.data);
      setViewMode('results');
    } catch (err) {
      setErrorAlert('Could not read specified historical audit metrics.');
    }
  };

  // Implements the high-density canvas containing the 4% opacity dotted grid
  const baseCanvasStyle = {
    backgroundColor: TOKENS.bgStone,
    backgroundImage: 'radial-gradient(#221F1D 1px, transparent 1px)',
    backgroundSize: '16px 16px',
    backgroundColor: TOKENS.bgStone,
    minHeight: '100vh',
    padding: '40px 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: TOKENS.inkCharcoal,
    boxSizing: 'border-box'
  };

  const innerWrapperStyle = {
    maxWidth: '1060px',
    margin: '0 auto',
    border: `1px solid ${TOKENS.inkCharcoal}`,
    padding: '36px',
    backgroundColor: TOKENS.bgStone,
    borderRadius: '2px',
    boxShadow: 'none'
  };

  return (
    <div style={baseCanvasStyle}>
      {/* Embedded global styles for handling pseudo-classes natively */}
      <style>{`
                .ledger-row-hover:hover {
                    background-color: ${TOKENS.bgHover} !important;
                }
            `}</style>

      <div style={innerWrapperStyle}>
        {errorAlert && (
          <div style={{ backgroundColor: TOKENS.accentBrick, color: TOKENS.bgStone, padding: '12px', fontSize: '13px', fontFamily: '"JetBrains Mono", monospace', marginBottom: '24px', borderRadius: '2px', fontWeight: '700' }}>
            [SYSTEM FAULT]: {errorAlert}
          </div>
        )}

        {viewMode === 'upload' && (
          <UploadView history={history} onUpload={handleInitialUpload} onSelectHistory={handleInspectReport} />
        )}

        {viewMode === 'mapping' && activeUpload && (
          <MappingReview mappings={activeUpload.mappings} onConfirm={handleMappingConfirm} />
        )}

        {viewMode === 'results' && activeReport && (
          <AuditResults reportData={activeReport} onBack={() => setViewMode('upload')} />
        )}
      </div>
    </div>
  );
}