import React from 'react';

export const TOKENS = {
    bgStone: '#EDEBE6',
    inkCharcoal: '#221F1D',
    accentForest: '#2F5D50',
    accentAmber: '#B8862B',
    accentBrick: '#8C3B2E',
    bgHover: '#E4E1DA'
};

/**
 * InkStamp Primitive
 * Implements a double 1px border with a 2px structural gap,
 * rotated exactly at -2 degrees using standard monospace text fonts.
 */
export function InkStamp({ verdict }) {
    const isSuccess = verdict === 'VALIDATED' || verdict === 'VALID';
    const stampColor = isSuccess ? TOKENS.accentForest : TOKENS.accentBrick;

    const outerContainerStyle = {
        display: 'inline-block',
        border: `1px solid ${stampColor}`,
        padding: '2px',
        transform: 'rotate(-2deg)',
        backgroundColor: 'transparent',
        flexShrink: 0
    };

    const innerContainerStyle = {
        border: `1px solid ${stampColor}`,
        padding: '3px 10px',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: stampColor
    };

    return (
        <div style={outerContainerStyle}>
            <div style={innerContainerStyle}>{verdict}</div>
        </div>
    );
}

/**
 * AsciiBar Primitive
 * Transforms variable evaluation numbers into structural block elements.
 */
export function AsciiBar({ percentage }) {
    const totalBlocks = 10;
    const filledBlocks = Math.round((Math.max(0, Math.min(100, percentage)) / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;

    return (
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', whiteSpace: 'pre' }}>
            {'█'.repeat(filledBlocks)}{'░'.repeat(emptyBlocks)} {percentage.toFixed(1)}%
        </span>
    );
}