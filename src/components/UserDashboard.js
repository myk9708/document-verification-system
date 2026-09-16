import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';

const STATUS_LABEL = {
  verified: 'VERIFIED', pending_authority: 'PENDING',
  needs_review: 'NEEDS REVIEW', rejected: 'REJECTED', processing: 'PROCESSING'
};
const STATUS_CLASS = {
  verified: 'verified', pending_authority: 'pending',
  needs_review: 'pending', rejected: 'rejected', processing: 'pending'
};

function NotificationBell({ onOpen, unread }) {
  return (
    <button onClick={onOpen} style={{
      position: 'relative', background: 'rgba(255,255,255,0.2)',
      border: '1px solid rgba(255,255,255,0.3)', color: 'white',
      borderRadius: '5px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '1.1rem'
    }}>
      🔔
      {unread > 0 && (
        <span style={{
          position: 'absolute', top: '-6px', right: '-6px',
          background: '#e53935', color: 'white', borderRadius: '50%',
          width: '18px', height: '18px', fontSize: '0.65rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
        }}>{unread > 9 ? '9+' : unread}</span>
      )}
    </button>
  );
}

function NotificationsPanel({ notifications, onClose, onMarkRead }) {
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '360px', height: '100vh',
      background: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      zIndex: 1000, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '1rem 1.5rem', background: '#7b1fa2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Notifications</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onMarkRead} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Mark all read
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer' }}>×</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {notifications.length === 0 ? (
          <p style={{ padding: '1rem', color: '#999', textAlign: 'center' }}>No notifications</p>
        ) : notifications.map(n => (
          <div key={n.id} style={{
            padding: '0.75rem 1rem', margin: '0.25rem 0', borderRadius: '6px',
            background: n.is_read ? '#fafafa' : '#f3e5f5',
            borderLeft: n.is_read ? '3px solid #e0e0e0' : '3px solid #7b1fa2',
            fontSize: '0.88rem'
          }}>
            <p style={{ margin: 0, color: '#333' }}>{n.message}</p>
            <p style={{ margin: '0.25rem 0 0', color: '#999', fontSize: '0.75rem' }}>{n.created_at?.slice(0, 16).replace('T', ' ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentModal({ doc, onClose, onDownload }) {
  const ai = doc.ai_analysis || {};
  const auth = doc.authority_action || {};
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div className="card" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>{doc.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          <p><strong>Type:</strong> {doc.type?.replace(/_/g, ' ')}</p>
          <p><strong>Date:</strong> {doc.upload_date?.slice(0, 10)}</p>
          <p><strong>Status:</strong> <span className={`status ${STATUS_CLASS[doc.status] || 'pending'}`}>{STATUS_LABEL[doc.status] || doc.status?.toUpperCase()}</span></p>
          {doc.file_size > 0 && <p><strong>Size:</strong> {Math.round(doc.file_size / 1024)} KB</p>}
          {doc.issued_by && <p style={{ gridColumn: '1/-1' }}><strong>Issued by:</strong> {doc.issued_by}</p>}
        </div>

        {ai.confidence_score != null && (
          <div className="ai-analysis">
            <h4>AI Analysis — {ai.engine || 'simulation'}</h4>
            <p><strong>Score:</strong> {ai.confidence_score}% · <strong>Authenticity:</strong> {ai.authenticity}</p>
            <p><strong>Recommendation:</strong> {ai.recommendation}</p>
            {ai.reasoning && <p style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: '#555' }}>{ai.reasoning}</p>}
            {ai.analysis_steps?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                {ai.analysis_steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.85rem' }}>
                    <span>{s.step?.replace(/_/g, ' ').toUpperCase()}</span>
                    <span><strong>{s.confidence}%</strong> — {s.details}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {auth.action && (
          <div className="blockchain-info">
            <h4>Authority Decision</h4>
            <p><strong>Action:</strong> {auth.action?.toUpperCase()} by {auth.authority_name || auth.authority}</p>
            <p><strong>Date:</strong> {auth.timestamp?.slice(0, 16).replace('T', ' ')}</p>
            {auth.comments && <p><strong>Comments:</strong> {auth.comments}</p>}
          </div>
        )}

        <div className="blockchain-info">
          <h4>Blockchain Hash</h4>
          <code style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>{doc.blockchain_hash}</code>
        </div>

        {doc.has_image && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Document Image</h4>
            <img
              src={`http://localhost:5000/api/document/${doc.id}/image`}
              alt="Document"
              style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '5px', marginTop: '0.5rem', border: '1px solid #ddd' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          {doc.status === 'verified' && (
            <button className="btn" onClick={() => onDownload(doc.id, doc.name)}
              style={{ background: '#2e7d32' }}>
              ⬇ Download PDF Certificate
            </button>
          )}
          <button className="btn" onClick={onClose} style={{ background: '#757575' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function UserDashboard({ userEmail }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

    const fetchDocuments = useCallback(async () => {
    try {
      const res = await apiFetch('/api/documents');
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchDocuments, fetchNotifications]);

  const handleViewDoc = async (docId) => {
    try {
      const res = await apiFetch(`/api/document/${docId}/details`);
      setViewingDoc(await res.json());
    } catch (e) { alert('Error loading document: ' + e.message); }
  };

  const handleDownload = async (docId, name) => {
    try {
      const res = await apiFetch(`/api/document/${docId}/download-certificate`);
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Download failed'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `certificate_${name}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Download error: ' + e.message); }
  };

  const handleMarkRead = async () => {
    await apiFetch('/api/notifications/read', { method: 'POST' });
    fetchNotifications();
  };

  const issuedDocs = documents.filter(d => d.issuedBy);
  const uploadedDocs = documents.filter(d => !d.issuedBy);

  return (
    <div>
      {/* Header bar */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>My Documents</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <NotificationBell unread={unreadCount} onOpen={() => { setShowNotifs(true); handleMarkRead(); }} />
            <button className="btn" onClick={fetchDocuments} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Refresh</button>
            <Link to="/upload"><button className="btn" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>+ Upload Document</button></Link>
          </div>
        </div>
      </div>

      {/* Notifications panel */}
      {showNotifs && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifs(false)}
          onMarkRead={handleMarkRead}
        />
      )}

      {loading ? (
        <div className="card"><p>Loading documents...</p></div>
      ) : (
        <>
          {/* Issued certificates section */}
          {issuedDocs.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>📜 Certificates Issued to Me</h3>
              <div className="document-grid">
                {issuedDocs.map(doc => (
                  <div key={doc.id} className="document-item">
                    <h4>{doc.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#555' }}>Issued by: {doc.issuedBy}</p>
                    <p style={{ fontSize: '0.85rem', color: '#555' }}>Date: {doc.uploadDate}</p>
                    <div style={{ margin: '0.5rem 0' }}>
                      <span className="status verified">VERIFIED</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button className="btn" onClick={() => handleViewDoc(doc.id)}
                        style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem' }}>View</button>
                      <button className="btn" onClick={() => handleDownload(doc.id, doc.name)}
                        style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem', background: '#2e7d32' }}>
                        ⬇ PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded documents section */}
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>📁 My Uploaded Documents</h3>
            {uploadedDocs.length === 0 ? (
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                No documents uploaded yet. <Link to="/upload">Upload your first document</Link>
              </p>
            ) : (
              <div className="document-grid">
                {uploadedDocs.map(doc => (
                  <div key={doc.id} className="document-item">
                    <h4>{doc.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#555' }}>Type: {doc.type?.replace(/_/g, ' ')}</p>
                    <p style={{ fontSize: '0.85rem', color: '#555' }}>Date: {doc.uploadDate}</p>
                    <div style={{ margin: '0.5rem 0' }}>
                      <span className={`status ${STATUS_CLASS[doc.status] || 'pending'}`}>
                        {STATUS_LABEL[doc.status] || doc.status?.toUpperCase()}
                      </span>
                    </div>
                    {doc.aiScore != null && (
                      <p style={{ fontSize: '0.82rem', color: '#7b1fa2', marginBottom: '0.5rem' }}>
                        AI Score: <strong>{doc.aiScore}%</strong>
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button className="btn" onClick={() => handleViewDoc(doc.id)}
                        style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem' }}>View</button>
                      {doc.status === 'verified' && (
                        <button className="btn" onClick={() => handleDownload(doc.id, doc.name)}
                          style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem', background: '#2e7d32' }}>
                          ⬇ PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {viewingDoc && (
        <DocumentModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

export default UserDashboard;
