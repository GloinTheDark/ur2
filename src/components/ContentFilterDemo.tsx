/**
 * Content Filter Demo Component
 * For testing and demonstrating the content filtering capabilities
 */

import React, { useState } from 'react';
import { validateDisplayName, getSuggestedNames, cleanDisplayName } from '../utils/contentFilter';

const ContentFilterDemo: React.FC = () => {
    const [testName, setTestName] = useState('');
    const [result, setResult] = useState<any>(null);

    const handleTest = () => {
        const validation = validateDisplayName(testName);
        const cleaned = cleanDisplayName(testName);
        const suggestions = getSuggestedNames(5);

        setResult({
            validation,
            cleaned,
            suggestions
        });
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'white',
            border: '2px solid #007bff',
            borderRadius: '8px',
            padding: '16px',
            width: '300px',
            fontSize: '12px',
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#007bff' }}>Content Filter Test</h4>

            <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Test a display name..."
                style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '8px'
                }}
            />

            <button
                onClick={handleTest}
                style={{
                    width: '100%',
                    padding: '6px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '8px'
                }}
            >
                Test Name
            </button>

            {result && (
                <div>
                    <div style={{
                        padding: '6px',
                        background: result.validation.isValid ? '#d4edda' : '#f8d7da',
                        color: result.validation.isValid ? '#155724' : '#721c24',
                        border: `1px solid ${result.validation.isValid ? '#c3e6cb' : '#f5c6cb'}`,
                        borderRadius: '4px',
                        marginBottom: '8px'
                    }}>
                        <strong>Status:</strong> {result.validation.isValid ? '✅ Valid' : '❌ Invalid'}
                        {result.validation.reason && (
                            <div><strong>Reason:</strong> {result.validation.reason}</div>
                        )}
                    </div>

                    {result.cleaned && result.cleaned !== testName && (
                        <div style={{
                            padding: '6px',
                            background: '#fff3cd',
                            color: '#856404',
                            border: '1px solid #ffeaa7',
                            borderRadius: '4px',
                            marginBottom: '8px'
                        }}>
                            <strong>Cleaned:</strong> "{result.cleaned}"
                        </div>
                    )}

                    <div style={{
                        padding: '6px',
                        background: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '4px'
                    }}>
                        <strong>Suggestions:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {result.suggestions.map((suggestion: string, index: number) => (
                                <span
                                    key={index}
                                    onClick={() => setTestName(suggestion)}
                                    style={{
                                        background: '#007bff',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '10px'
                                    }}
                                >
                                    {suggestion}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentFilterDemo;
