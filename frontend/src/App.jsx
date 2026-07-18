import React from 'react';
import MappingReview from './MappingReview';

export default function App() {
  // Simulating the exact structure our Levenshtein backend returns
  const sampleBackendPayload = [
    { sourceColumn: 'Full Name', suggestedTarget: 'name', confidenceScore: 88.2 },
    { sourceColumn: 'Email Address', suggestedTarget: 'email', confidenceScore: 94.5 },
    { sourceColumn: 'Ph. Number', suggestedTarget: 'phone', confidenceScore: 68.1 },
    { sourceColumn: 'Current Age', suggestedTarget: 'age', confidenceScore: 74.0 },
    { sourceColumn: 'Internal Notes ID', suggestedTarget: null, confidenceScore: 14.2 }
  ];

  const handleMappingConfirmation = (finalFormMap) => {
    console.log('Confirmed User Schema Map Payload:', finalFormMap);
    alert('Data map submitted to engineering console. Check your F12 inspect logs.');
  };

  return (
    <div style={{ backgroundColor: '#221F1D', minHeight: '100vh', padding: '60px 20px' }}>
      <MappingReview
        mappings={sampleBackendPayload}
        onConfirm={handleMappingConfirmation}
      />
    </div>
  );
}