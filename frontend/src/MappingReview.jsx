import React, { useState } from 'react';

// Design tokens mapping directly to our strict audit ledger specification
const COLORS = {
    bgStone: '#EDEBE6',        // Warm stone gray canvas
    inkCharcoal: '#221F1D',    // Near-black text and borders
    accentAmber: '#B8862B',    // Medium confidence warnings
    accentForest: '#2F5D50',   // High confidence success
    accentBrick: '#8C3B2E',    // Low confidence errors
    whiteLight: '#FFFFFF'
};

/**
 * Returns specific color palettes based on the algorithmic confidence score.
 */
const getConfidenceStyles = (score) => {
    if (score >= 80) {
        return { backgroundColor: COLORS.accentForest, color: COLORS.bgStone };
    }
    if (score >= 50) {
        return { backgroundColor: COLORS.accentAmber, color: COLORS.inkCharcoal };
    }
    return { backgroundColor: COLORS.accentBrick, color: COLORS.bgStone };
};

export default function MappingReview({
    mappings = [],
    targetFields = ['name', 'email', 'phone', 'age'],
    onConfirm
}) {
    // Tracks user manual overrides: { [csvColumnHeader]: selectedTargetField }
    const [selectedMappings, setSelectedMappings] = useState(() => {
        const initialState = {};
        mappings.forEach(item => {
            initialState[item.sourceColumn] = item.suggestedTarget || '';
        });
        return initialState;
    });

    const handleSelectChange = (sourceColumn, value) => {
        setSelectedMappings(prev => ({
            ...prev,
            [sourceColumn]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (typeof onConfirm === 'function') {
            onConfirm(selectedMappings);
        }
    };

    // Strict Table-First Ledger Styles Layout
    const containerStyle = {
        backgroundColor: COLORS.bgStone,
        color: COLORS.inkCharcoal,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '32px',
        border: `1px solid ${COLORS.inkCharcoal}`,
        borderRadius: '2px',
        maxWidth: '900px',
        margin: '0 auto',
        boxShadow: 'none'
    };

    const headerAreaStyle = {
        borderBottom: `2px solid ${COLORS.inkCharcoal}`,
        paddingBottom: '12px',
        marginBottom: '24px'
    };

    const titleStyle = {
        margin: 0,
        fontSize: '22px',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        textTransform: 'uppercase'
    };

    const subtitleStyle = {
        margin: '6px 0 0 0',
        fontSize: '13px',
        lineHeight: '1.5',
        opacity: 0.85
    };

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '28px',
        fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, Monaco, Consolas, monospace'
    };

    const thStyle = {
        borderBottom: `2px solid ${COLORS.inkCharcoal}`,
        color: COLORS.inkCharcoal,
        textAlign: 'left',
        padding: '10px 12px',
        fontSize: '12px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.08em'
    };

    const tdStyle = {
        borderBottom: `1px solid rgba(34, 31, 29, 0.15)`,
        padding: '12px',
        verticalAlign: 'middle',
        fontSize: '14px',
        color: COLORS.inkCharcoal
    };

    const selectStyle = {
        width: '100%',
        padding: '8px 10px',
        backgroundColor: COLORS.bgStone,
        color: COLORS.inkCharcoal,
        border: `1px solid ${COLORS.inkCharcoal}`,
        borderRadius: '2px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        cursor: 'pointer',
        outline: 'none'
    };

    const badgeStyle = (score) => ({
        display: 'inline-block',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: '700',
        borderRadius: '2px',
        letterSpacing: '0.02em',
        ...getConfidenceStyles(score)
    });

    const buttonStyle = {
        backgroundColor: COLORS.inkCharcoal,
        color: COLORS.bgStone,
        border: `1px solid ${COLORS.inkCharcoal}`,
        padding: '14px 24px',
        fontSize: '13px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderRadius: '2px',
        cursor: 'pointer',
        width: '100%',
        transition: 'background-color 0.15s ease'
    };

    return (
        <div style={containerStyle}>
            <div style={headerAreaStyle}>
                <h2 style={titleStyle}>Schema Mapping Ledger</h2>
                <p style={subtitleStyle}>
                    Review the system's auto-suggested column matches below. Override assignments manually where required prior to executing the database transaction.
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Source Column (CSV)</th>
                            <th style={thStyle}>Target System Field</th>
                            <th style={thStyle}>Confidence Metric</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mappings.map((item, index) => {
                            const currentSelection = selectedMappings[item.sourceColumn];
                            return (
                                <tr key={index}>
                                    <td style={{ ...tdStyle, fontWeight: '600' }}>
                                        {item.sourceColumn}
                                    </td>
                                    <td style={tdStyle}>
                                        <select
                                            value={currentSelection}
                                            onChange={(e) => handleSelectChange(item.sourceColumn, e.target.value)}
                                            style={selectStyle}
                                        >
                                            <option value="">[SKIP COLUMN FROM INGESTION]</option>
                                            {targetFields.map((field) => (
                                                <option key={field} value={field}>
                                                    {field.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={badgeStyle(item.confidenceScore)}>
                                            {item.confidenceScore.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <button type="submit" style={buttonStyle}>
                    Commit Schema Mappings & Validate Rows
                </button>
            </form>
        </div>
    );
}