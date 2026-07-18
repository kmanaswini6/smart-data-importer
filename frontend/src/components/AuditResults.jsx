import React from 'react';
import { TOKENS, InkStamp } from './LedgerPrimitives';

export default function AuditResults({ reportData, onBack }) {
    const { stats, errors, preview } = reportData;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${TOKENS.inkCharcoal}`, paddingBottom: '14px', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Import Audit Log Report</h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.75, fontFamily: '"JetBrains Mono", monospace' }}>Source Archive Trace: {stats.filename}</p>
                </div>
                <button onClick={onBack} style={{ backgroundColor: 'transparent', color: TOKENS.inkCharcoal, border: `1px solid ${TOKENS.inkCharcoal}`, padding: '8px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', borderRadius: '2px' }}>
                    Return to Ingestion Hub
                </button>
            </div>

            {/* Flat Metric Cards Grid with Top Border Only */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '44px' }}>
                <div style={{ border: `1px solid ${TOKENS.inkCharcoal}`, padding: '16px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', fontFamily: 'system-ui, sans-serif', fontVariant: 'small-caps' }}>TOTAL ROWS</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '6px', fontFamily: '"JetBrains Mono", monospace' }}>{stats.total_rows}</div>
                </div>
                <div style={{ border: `1px solid ${TOKENS.inkCharcoal}`, borderTop: `4px solid ${TOKENS.accentForest}`, padding: '16px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', fontFamily: 'system-ui, sans-serif', fontVariant: 'small-caps', color: TOKENS.accentForest }}>VALID ROWS</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '6px', fontFamily: '"JetBrains Mono", monospace', color: TOKENS.accentForest }}>{stats.valid_rows}</div>
                </div>
                <div style={{ border: `1px solid ${TOKENS.inkCharcoal}`, borderTop: `4px solid ${TOKENS.accentBrick}`, padding: '16px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', fontFamily: 'system-ui, sans-serif', fontVariant: 'small-caps', color: TOKENS.accentBrick }}>INVALID ROWS</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '6px', fontFamily: '"JetBrains Mono", monospace', color: TOKENS.accentBrick }}>{stats.invalid_rows}</div>
                </div>
            </div>

            {/* Pristine Verified Panel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', margin: 0, letterSpacing: '0.05em' }}>Storage Insertion Sample Preview (First 5 Rows)</h3>
                <InkStamp verdict="VALIDATED" />
            </div>
            <div className="ledger-scroll-x">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: '"JetBrains Mono", monospace' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(34,31,29,0.03)', borderBottom: `1px solid ${TOKENS.inkCharcoal}` }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px' }}>Row ID</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px' }}>Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px' }}>Email Address</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px' }}>Phone</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px' }}>Age</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preview.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(34,31,29,0.15)' }}>
                                <td style={{ padding: '12px' }}>{String(row.id).padStart(4, '0')}</td>
                                <td style={{ padding: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: '600' }}>{row.name}</td>
                                <td style={{ padding: '12px' }}>{row.email}</td>
                                <td style={{ padding: '12px' }}>{row.phone || '[NULL]'}</td>
                                <td style={{ padding: '12px' }}>{row.age || '[NULL]'}</td>
                            </tr>
                        ))}
                        {preview.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', opacity: 0.6 }}>No data insertion records available for sample visualization.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Validation Violations Panel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', marginTop: '40px' }}>
                <h3 style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: '700', color: TOKENS.accentBrick, margin: 0, letterSpacing: '0.05em' }}>Validation System Integrity Violation Log</h3>
                {errors.length > 0 && <InkStamp verdict="REJECTED" />}
            </div>
            <div className="ledger-scroll-x">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(140,59,46,0.04)', borderBottom: `1px solid ${TOKENS.inkCharcoal}`, color: TOKENS.accentBrick }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', width: '90px' }}>File Row</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', width: '260px' }}>Violation Reason</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px' }}>Raw Payload Source Object</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {errors.map((err) => (
                            <tr key={err.id} style={{ borderBottom: '1px solid rgba(34,31,29,0.15)' }}>
                                <td style={{ padding: '12px', fontWeight: '700' }}>{String(err.row_number).padStart(4, '0')}</td>
                                <td style={{ padding: '12px', fontFamily: 'system-ui, sans-serif', color: TOKENS.accentBrick, fontWeight: '500' }}>{err.reason}</td>
                                <td style={{ padding: '12px', fontSize: '11px', whiteSpace: 'normal', wordBreak: 'break-all', backgroundColor: 'rgba(34,31,29,0.02)' }}>
                                    {typeof err.raw_data === 'string' ? err.raw_data : JSON.stringify(err.raw_data)}
                                </td>
                            </tr>
                        ))}
                        {errors.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ padding: '24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', color: TOKENS.accentForest, fontWeight: '700' }}>
                                    0 violations. Every row cleared validation.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}