import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function BlockchainVisualizer({ chain, isValid }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h3>Blockchain Chain ({chain.length} blocks)</h3>
        <span style={{
          padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 'bold',
          background: isValid ? '#d4edda' : '#f8d7da',
          color: isValid ? '#155724' : '#721c24'
        }}>
          {isValid ? '✓ VALID' : '✗ INVALID'}
        </span>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', minWidth: 'max-content' }}>
          {chain.map((block, i) => (
            <React.Fragment key={block.index}>
              <div
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  border: '2px solid', borderColor: i === 0 ? '#7b1fa2' : '#667eea',
                  borderRadius: '8px', padding: '0.75rem', width: '160px', cursor: 'pointer',
                  background: expanded === i ? '#f3e5f5' : 'white',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: i === 0 ? '#7b1fa2' : '#667eea' }}>
                  {i === 0 ? 'GENESIS' : `BLOCK #${block.index}`}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#666', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                  <strong>Hash:</strong><br />
                  <code>{block.hash?.slice(0, 16)}...</code>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '0.25rem' }}>
                  {block.timestamp?.slice(0, 10)}
                </div>
                {expanded === i && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: '#444', borderTop: '1px solid #ddd', paddingTop: '0.5rem' }}>
                    <div><strong>Prev:</strong><br /><code style={{ wordBreak: 'break-all' }}>{block.previous_hash?.slice(0, 20)}...</code></div>
                    {block.data?.document_type && <div style={{ marginTop: '0.25rem' }}><strong>Doc:</strong> {block.data.document_type}</div>}
                    {block.data?.status && <div><strong>Status:</strong> {block.data.status}</div>}
                    {block.data?.user_email && <div><strong>User:</strong> {block.data.user_email}</div>}
                  </div>
                )}
              </div>
              {i < chain.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: '#667eea', fontSize: '1.2rem' }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthorityPortal({ user }) {
  const [searchHash, setSearchHash] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [comments, setComments] = useState('');
  const [chainData, setChainData] = useState(null);
  const [showChain, setShowChain] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchPendingDocs(); }, []);

  const fetchPendingDocs = async () => {
    try {
      const res = await apiFetch('/api/pending-documents');
      setPendingDocs(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchChain = async () => {
    try {
      const res = await apiFetch('/api/blockchain/chain');
      setChainData(await res.json());
      setShowChain(true);
    } catch (e) { alert('Error loading chain: ' + e.message); }
  };

  const handleVerifyHash = async () => {
    if (!searchHash.trim()) return;
    try {
      const res = await apiFetch('/api/verify-hash', { method: 'POST', body: JSON.stringify({ hash: searchHash }) });
      const data = await res.json();
      setVerificationResult(data.valid
        ? { valid: true, ...data.document }
        : { valid: false, message: data.message }
      );
    } catch (e) { setVerificationResult({ valid: false, message: e.message }); }
  };

  const handleAction = async (docId, action) => {
    setActionLoading(docId + action);
    try {
      const res = await apiFetch('/api/authority-action', {
        method: 'POST',
        body: JSON.stringify({ document_id: docId, action, comments })
      });
      const data = await res.json();
      if (data.success) {
        setComments('');
        setViewingDoc(null);
        fetchPendingDocs();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) { alert(e.message); }
    setActionLoading(null);
  };

  const handleViewDoc = async (docId) => {
    try {
      const res = await apiFetch(`/api/document/${docId}/details`);
      setViewingDoc(await res.json());
      setComments('');
    } catch (e) { alert('Error loading document: ' + e.message); }
  };

  return (
    <div>
      <div className="card">
        <h2>Verifying Authority Portal</h2>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          Logged in as <strong>{user?.name}</strong> · {user?.email}
        </p>
      </div>

      {/* Hash verification */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Verify Document by Blockchain Hash</h3>
          <button className="btn" onClick={fetchChain} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', background: '#1a237e' }}>
            🔗 View Blockchain
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text" placeholder="Enter blockchain hash..."
            value={searchHash} onChange={e => setSearchHash(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerifyHash()}
            style={{ flex: 1, padding: '0.6rem', border: '1px solid #ddd', borderRadius: '5px' }}
          />
          <button className="btn" onClick={handleVerifyHash}>Verify</button>
        </div>

        {verificationResult && (
          <div className={verificationResult.valid ? 'blockchain-info' : 'ai-analysis'} style={{ marginTop: '1rem' }}>
            <h4>{verificationResult.valid ? '✅ Valid Document' : '❌ Invalid Hash'}</h4>
            {verificationResult.valid ? (
              <>
                <p><strong>Type:</strong> {verificationResult.type}</p>
                <p><strong>Owner:</strong> {verificationResult.owner}</p>
                <p><strong>Issue Date:</strong> {verificationResult.issue_date}</p>
                <p><strong>Status:</strong> {verificationResult.status}</p>
                {verificationResult.ai_score && <p><strong>AI Score:</strong> {verificationResult.ai_score}%</p>}
              </>
            ) : <p>{verificationResult.message}</p>}
          </div>
        )}
      </div>

      {/* Blockchain visualizer */}
      {showChain && chainData && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span />
            <button onClick={() => setShowChain(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
          </div>
          <BlockchainVisualizer chain={chainData.chain} isValid={chainData.is_valid} />
        </div>
      )}

      {/* Pending documents */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Pending Verifications ({pendingDocs.length})</h3>
          <button className="btn" onClick={fetchPendingDocs} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>Refresh</button>
        </div>

        {loading ? <p style={{ marginTop: '1rem' }}>Loading...</p> :
          pendingDocs.length === 0 ? <p style={{ marginTop: '1rem', color: '#666' }}>No documents pending verification.</p> : (
            <div className="document-grid" style={{ marginTop: '1rem' }}>
              {pendingDocs.map(doc => (
                <div key={doc.id} className="document-item">
                  <h4>{doc.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#555' }}>By: {doc.submittedBy}</p>
                  <p style={{ fontSize: '0.85rem', color: '#555' }}>Date: {doc.submissionDate}</p>
                  <p style={{ fontSize: '0.85rem', color: '#555' }}>Type: {doc.type?.replace(/_/g, ' ')}</p>

                  <div className="ai-analysis" style={{ margin: '0.5rem 0', padding: '0.5rem' }}>
                    <p style={{ fontSize: '0.82rem' }}>
                      <strong>AI Score:</strong> {doc.aiScore}% &nbsp;
                      <span style={{ fontSize: '0.72rem', background: '#ede7f6', padding: '0.1rem 0.4rem', borderRadius: '8px', color: '#4a148c' }}>
                        {doc.aiEngine}
                      </span>
                    </p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#555' }}>{doc.recommendation}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => handleViewDoc(doc.id)}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', background: '#1565c0' }}>
                      View
                    </button>
                    <button className="btn"
                      disabled={actionLoading === doc.id + 'approve'}
                      onClick={() => handleAction(doc.id, 'approve')}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', background: '#2e7d32' }}>
                      {actionLoading === doc.id + 'approve' ? '...' : '✓ Approve'}
                    </button>
                    <button className="btn"
                      disabled={actionLoading === doc.id + 'reject'}
                      onClick={() => handleAction(doc.id, 'reject')}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', background: '#c62828' }}>
                      {actionLoading === doc.id + 'reject' ? '...' : '✗ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Document detail modal */}
      {viewingDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '750px', maxHeight: '90vh', overflow: 'auto', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Review: {viewingDoc.name}</h3>
              <button onClick={() => setViewingDoc(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              <p><strong>Type:</strong> {viewingDoc.type?.replace(/_/g, ' ')}</p>
              <p><strong>Date:</strong> {viewingDoc.upload_date?.slice(0, 10)}</p>
              <p><strong>Status:</strong> {viewingDoc.status}</p>
              {viewingDoc.file_size > 0 && <p><strong>Size:</strong> {Math.round(viewingDoc.file_size / 1024)} KB</p>}
            </div>

            {viewingDoc.ai_analysis && (
              <div className="ai-analysis">
                <h4>AI Analysis — <span style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>{viewingDoc.ai_analysis.engine}</span></h4>
                <p><strong>Score:</strong> {viewingDoc.ai_analysis.confidence_score}% · <strong>Authenticity:</strong> {viewingDoc.ai_analysis.authenticity}</p>
                <p><strong>Recommendation:</strong> {viewingDoc.ai_analysis.recommendation}</p>
                {viewingDoc.ai_analysis.reasoning && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: '#555' }}>{viewingDoc.ai_analysis.reasoning}</p>
                )}
                {viewingDoc.ai_analysis.analysis_steps?.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {viewingDoc.ai_analysis.analysis_steps.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.84rem' }}>
                        <span>{s.step?.replace(/_/g, ' ').toUpperCase()}</span>
                        <span><strong>{s.confidence}%</strong> — {s.details}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="blockchain-info">
              <strong>Blockchain Hash:</strong>
              <br /><code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{viewingDoc.blockchain_hash}</code>
            </div>

            {viewingDoc.has_image && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong>Document Image:</strong>
                <img
                  src={`http://localhost:5000/api/document/${viewingDoc.id}/image`}
                  alt="Document"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '300px', marginTop: '0.5rem', borderRadius: '5px', border: '1px solid #ddd' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            )}

            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Comments (optional)</label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add comments for the document owner..."
                style={{ width: '100%', padding: '0.6rem', marginTop: '0.4rem', border: '1px solid #ddd', borderRadius: '5px', height: '80px', resize: 'vertical', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn"
                disabled={actionLoading === viewingDoc.id + 'approve'}
                onClick={() => handleAction(viewingDoc.id, 'approve')}
                style={{ background: '#2e7d32' }}>
                {actionLoading === viewingDoc.id + 'approve' ? 'Approving...' : '✓ Approve Document'}
              </button>
              <button className="btn"
                disabled={actionLoading === viewingDoc.id + 'reject'}
                onClick={() => handleAction(viewingDoc.id, 'reject')}
                style={{ background: '#c62828' }}>
                {actionLoading === viewingDoc.id + 'reject' ? 'Rejecting...' : '✗ Reject Document'}
              </button>
              <button className="btn" onClick={() => setViewingDoc(null)} style={{ background: '#757575' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthorityPortal;
