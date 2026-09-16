import React, { useState } from 'react';
import { apiFetch } from '../api';

function DocumentUpload({ userEmail }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      // user_email is now read from JWT token on the backend
      
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Document uploaded successfully!\nAI Score: ${result.ai_analysis.confidence_score}%\nStatus: ${result.status}`);
        setSelectedFile(null);
        setDocumentType('');
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
    
    setUploading(false);
  };

  return (
    <div className="card">
      <h2>Upload Document for Verification</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>Uploading as: {userEmail}</p>
      
      <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
        <input
          id="fileInput"
          type="file"
          accept=".pdf,.jpg,.png,.jpeg"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {selectedFile ? (
          <p>Selected: {selectedFile.name}</p>
        ) : (
          <p>Click to select document (PDF, JPG, PNG)</p>
        )}
      </div>

      <select 
        value={documentType} 
        onChange={(e) => setDocumentType(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', margin: '1rem 0' }}
      >
        <option value="">Select Document Type</option>
        <option value="birth_certificate">Birth Certificate</option>
        <option value="academic_transcript">Academic Transcript</option>
        <option value="id_document">ID Document</option>
        <option value="experience_certificate">Experience Certificate</option>
      </select>

      <button 
        className="btn" 
        onClick={handleUpload}
        disabled={!selectedFile || !documentType || uploading}
      >
        {uploading ? 'Processing...' : 'Upload & Verify'}
      </button>

      <div className="ai-analysis">
        <h3>AI Verification Process</h3>
        <p>• Document authenticity check</p>
        <p>• Text extraction and validation</p>
        <p>• Pattern recognition analysis</p>
      </div>
    </div>
  );
}

export default DocumentUpload;