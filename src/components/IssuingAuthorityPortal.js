import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

const DOC_TYPES = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'academic_transcript', label: 'Academic Transcript' },
  { value: 'id_document', label: 'ID Document' },
  { value: 'experience_certificate', label: 'Experience Certificate' }
];

const inputStyle = {
  width: '100%', padding: '0.6rem', margin: '0.4rem 0',
  border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.95rem'
};

function IssuingAuthorityPortal({ user }) {
  const [individuals, setIndividuals] = useState([]);
  const [issuedCerts, setIssuedCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({
    recipient_email: '', document_type: '',
    holder_name: '', institution: '', additional_info: ''
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    Promise.all([fetchIndividuals(), fetchIssuedCerts()]).finally(() => setLoading(false));
  }, []);

  const fetchIndividuals = async () => {
    try {
      const res = await apiFetch('/api/individuals');
      setIndividuals(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchIssuedCerts = async () => {
    try {
      const res = await apiFetch('/api/issued-certificates');
      setIssuedCerts(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!form.recipient_email || !form.document_type) return;
    setIssuing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/api/issue-certificate', {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: form.recipient_email,
          document_type: form.document_type,
          certificate_data: {
            holder_name: form.holder_name,
            institution: form.institution,
            additional_info: form.additional_info
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Certificate issued! Blockchain hash: ${data.blockchain_hash}`);
        setForm({ recipient_email: '', document_type: '', holder_name: '', institution: '', additional_info: '' });
        fetchIssuedCerts();
      } else {
        setErrorMsg(data.error || 'Failed to issue certificate');
      }
    } catch (e) {
      setErrorMsg(e.message);
    }
    setIssuing(false);
  };

  const handleDownload = async (docId, name) => {
    try {
      const res = await apiFetch(`/api/document/${docId}/download-certificate`);
      if (!res.ok) { alert('Download failed'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `certificate_${name}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Download error: ' + e.message); }
  };

  return (
    <div>
      <div className="card">
        <h2>Issuing Authority Portal</h2>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          Logged in as <strong>{user.name}</strong> · {user.email}
        </p>
      </div>

      {/* Issue Certificate Form */}
      <div className="card">
        <h3>Issue New Certificate</h3>
        <form onSubmit={handleIssue} style={{ marginTop: '1rem' }}>
          <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Recipient</label>
          <select
            value={form.recipient_email}
            onChange={e => setForm({ ...form, recipient_email: e.target.value })}
            style={inputStyle} required
          >
            <option value="">Select individual...</option>
            {individuals.map(u => (
              <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
            ))}
          </select>

          <label style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.5rem', display: 'block' }}>
            Certificate Type
          </label>
          <select
            value={form.document_type}
            onChange={e => setForm({ ...form, document_type: e.target.value })}
            style={inputStyle} required
          >
            <option value="">Select type...</option>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <label style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.5rem', display: 'block' }}>
            Certificate Details
          </label>
          <input type="text" placeholder="Holder Full Name *"
            value={form.holder_name} onChange={e => setForm({ ...form, holder_name: e.target.value })}
            style={inputStyle} required />
          <input type="text" placeholder="Institution / Organization (optional)"
            value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })}
            style={inputStyle} />
          <textarea placeholder="Additional info (grades, designation, etc.) — optional"
            value={form.additional_info} onChange={e => setForm({ ...form, additional_info: e.target.value })}
            style={{ ...inputStyle, height: '80px', resize: 'vertical' }} />

          {successMsg && (
            <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '5px', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#155724', wordBreak: 'break-all' }}>
              ✅ {successMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '5px', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#721c24' }}>
              ❌ {errorMsg}
            </div>
          )}

          <button type="submit" className="btn" disabled={issuing} style={{ marginTop: '1rem' }}>
            {issuing ? 'Issuing...' : 'Issue Certificate'}
          </button>
        </form>
      </div>

      {/* Issued Certificates */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Issued Certificates ({issuedCerts.length})</h3>
          <button className="btn" onClick={fetchIssuedCerts} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
            Refresh
          </button>
        </div>

        {loading ? <p style={{ marginTop: '1rem' }}>Loading...</p> : (
          issuedCerts.length === 0 ? (
            <p style={{ marginTop: '1rem', color: '#666' }}>No certificates issued yet.</p>
          ) : (
            <div className="document-grid" style={{ marginTop: '1rem' }}>
              {issuedCerts.map(cert => (
                <div key={cert.id} className="document-item">
                  <h4 style={{ marginBottom: '0.5rem' }}>{cert.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#555' }}>To: {cert.recipientEmail}</p>
                  <p style={{ fontSize: '0.85rem', color: '#555' }}>Date: {cert.issuedDate}</p>
                  <div style={{ margin: '0.5rem 0' }}>
                    <span className="status verified">VERIFIED</span>
                  </div>
                  <div className="blockchain-info" style={{ margin: '0.5rem 0' }}>
                    <code style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{cert.blockchainHash}</code>
                  </div>
                  <button
                    className="btn"
                    onClick={() => handleDownload(cert.id, cert.name)}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', marginTop: '0.5rem', width: '100%' }}
                  >
                    ⬇ Download PDF Certificate
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default IssuingAuthorityPortal;
