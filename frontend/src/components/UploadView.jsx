import React, { useState, useEffect } from 'react';
import { TOKENS } from './LedgerPrimitives';

export default function UploadView({ history = [], onUpload, onSelectHistory }) {
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [spinnerFrame, setSpinnerFrame] = useState('|');

    useEffect(() => {
        if (!processing) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const frames = ['|', '/', '-', '\\'];
        let idx = 0;
        const interval = setInterval(() => {
            idx = (idx + 1) % frames.length;
            setSpinnerFrame(frames[idx]);
        }, 150);
        return () => clearInterval(interval);
    }, [processing]);

    const handleFileSubmission = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setProcessing(true);
        await onUpload(file);
        setProcessing(false);
    };

    return (
        <div>
            <div style={{ borderBottom: `2px solid ${TOKENS.inkCharcoal}`, paddingBottom: '14px', marginBottom: '28px' }}>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Data Ingestion Hub</h1>
            </div>

            {processing ? (
                <div style={{ border: `1px solid ${TOKENS.inkCharcoal}`, padding: '72px 20px', textAlign: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: '14px', fontWeight: '700', letterSpacing: '0.05em' }}>
                    {window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'PROCESSING...' : `PROCESSING ${spinnerFrame}`}
                </div>
            ) : (
                <label
                    style={{ display: 'block', border: `1px dashed ${TOKENS.inkCharcoal}`, padding: '56px 20px', textAlign: 'center', backgroundColor: isDragging ? TOKENS.bgHover : 'rgba(34,31,29,0.02)', cursor: 'pointer', marginBottom: '44px', transition: 'background-color 0.12s ease-in-out' }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileSubmission({ target: { files: e.dataTransfer.files } }); }}
                >
                    <span style={{ fontSize: '14px', fontWeight: '600', color: TOKENS.inkCharcoal }}>Drop a CSV to begin, or click to browse.</span>
                    <input type="file" accept=".csv" onChange={handleFileSubmission} style={{ display: 'none' }} />
                </label>
            )}

            <h3 style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '14px', fontWeight: '700' }}>System Ingestion History Trace Log</h3>
            <div className="ledger-scroll-x">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: `2px solid ${TOKENS.inkCharcoal}`, backgroundColor: 'rgba(34,31,29,0.03)' }}>
                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, backgroundColor: TOKENS.bgStone }}>Timestamp</th>
                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, backgroundColor: TOKENS.bgStone }}>Filename</th>
                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, backgroundColor: TOKENS.bgStone }}>Total Rows</th>
                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, backgroundColor: TOKENS.bgStone }}>Status</th>
                            <th style={{ textAlign: 'right', padding: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, backgroundColor: TOKENS.bgStone }}>Action</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                        {history.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(34,31,29,0.15)', transition: 'background-color 0.1s' }} className="ledger-row-hover">
                                <td style={{ padding: '12px' }}>{new Date(row.uploaded_at).toISOString().replace('T', ' ').substring(0, 19)}</td>
                                <td style={{ padding: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: '600' }}>{row.filename}</td>
                                <td style={{ padding: '12px' }}>{row.total_rows}</td>
                                <td style={{ padding: '12px', fontWeight: '700' }}>
                                    {row.status === 'completed' ? (
                                        <span style={{ color: TOKENS.accentForest }}>✓ VALID</span>
                                    ) : (
                                        <span style={{ color: TOKENS.accentAmber }}>▲ WARNING</span>
                                    )}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                    <button
                                        onClick={() => onSelectHistory(row.id)}
                                        style={{ backgroundColor: TOKENS.inkCharcoal, color: TOKENS.bgStone, border: 'none', padding: '6px 12px', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', fontWeight: '700', letterSpacing: '0.04em', borderRadius: '2px' }}
                                    >
                                        Inspect
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', opacity: 0.65 }}>No imports yet. Drop a CSV to begin.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}