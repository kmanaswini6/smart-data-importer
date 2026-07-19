import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Login({ onAuthSuccess }) {
    const { login } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await login(email, password);
            if (onAuthSuccess) onAuthSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication sequence failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            backgroundColor: '#EDEBE6',
            color: '#221F1D',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                border: '1px solid #221F1D',
                backgroundColor: '#EDEBE6',
                padding: '32px',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    fontSize: '12px',
                    letterSpacing: '1px',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    color: '#66615C'
                }}>
                    SYSTEM GATEKEEPER // ACCESS CONTROL
                </div>

                <h1 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    margin: '0 0 24px 0',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid #221F1D',
                    paddingBottom: '8px'
                }}>
                    IDENT_VERIFY
                </h1>

                {error && (
                    <div style={{
                        border: '1px solid #C23B22',
                        color: '#C23B22',
                        padding: '12px',
                        fontSize: '13px',
                        marginBottom: '20px',
                        backgroundColor: 'rgba(194,59,34,0.05)'
                    }}>
                        CRITICAL_ERR: {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', fontWeight: 'bold' }}>
                            USER_EMAIL
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #221F1D',
                                backgroundColor: '#EDEBE6',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                color: '#221F1D',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', fontWeight: 'bold' }}>
                            PASSPHRASE
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #221F1D',
                                backgroundColor: '#EDEBE6',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                color: '#221F1D',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#221F1D',
                            color: '#EDEBE6',
                            fontFamily: 'inherit',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            textTransform: 'uppercase',
                            fontSize: '14px'
                        }}
                    >
                        {isSubmitting ? 'EXECUTING...' : 'INITIATE_SESSION ➔'}
                    </button>
                </form>
            </div>
        </div>
    );
}