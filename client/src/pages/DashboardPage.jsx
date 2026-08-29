import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useWorkspaceStore from '../store/workspaceStore';
import useBoardStore from '../store/boardStore';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { getErrorMessage } from '../utils/helpers';

export default function DashboardPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    workspaces,
    currentWorkspace,
    loading,
    fetchWorkspaces,
    fetchWorkspace,
    createWorkspace,
    joinByCode,
  } = useWorkspaceStore();
  const { boards, fetchBoards, createBoard } = useBoardStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [inviteCode, setInviteCode] = useState('');
  const [boardForm, setBoardForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace(workspaceId);
      if (workspaces.length) fetchBoards(workspaceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, workspaces.length]);

  const selectWorkspace = (id) => navigate(`/w/${id}`);

  const onSubmitCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const ws = await createWorkspace(form);
      setCreateOpen(false);
      setForm({ name: '', description: '' });
      navigate(`/w/${ws._id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create workspace'));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitJoin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { workspace } = await joinByCode(inviteCode);
      await fetchWorkspaces();
      setJoinOpen(false);
      setInviteCode('');
      navigate(`/w/${workspace._id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to join workspace'));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitBoard = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const board = await createBoard({ ...boardForm, workspace: workspaceId });
      setBoardOpen(false);
      setBoardForm({ name: '', description: '' });
      navigate(`/b/${board._id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create board'));
    } finally {
      setSubmitting(false);
    }
  };

  const amOwner =
    currentWorkspace?.members?.some(
      (m) => String(m.user.id) === String(user?._id) && m.role === 'owner'
    ) || false;

  const [copied, setCopied] = useState(false);
  const copyInvite = () => {
    if (currentWorkspace?.inviteCode) {
      navigator.clipboard?.writeText(currentWorkspace.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const regenerateInvite = async () => {
    if (!window.confirm('Regenerate the invite code? The old code stops working.')) return;
    try {
      const res = await api.post(`/workspaces/${workspaceId}/invite-code`);
      fetchWorkspace(workspaceId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to regenerate invite code'));
    }
  };

  if (loading && workspaces.length === 0) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="container">
      {!workspaceId ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1>Your Workspaces</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { setError(''); setJoinOpen(true); }}>
                Join with code
              </button>
              <button className="btn btn-primary" onClick={() => { setError(''); setCreateOpen(true); }}>
                New workspace
              </button>
            </div>
          </div>

          {workspaces.length === 0 ? (
            <div className="empty-state card">
              <p>No workspaces yet. Create one to get started, or join with an invite code.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  className="card"
                  style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--surface)' }}
                  onClick={() => selectWorkspace(ws._id)}
                >
                  <h3 style={{ fontSize: 16 }}>{ws.name}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0 0' }}>
                    {ws.description || 'No description'}
                  </p>
                  <span className="badge">{ws.role}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h1>{currentWorkspace?.name || 'Workspace'}</h1>
              <p style={{ color: 'var(--muted)', margin: 0 }}>
                {currentWorkspace?.members?.length || 0} members
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="btn" to={`/w/${workspaceId}/members`}>
                Members
              </Link>
              <button className="btn" onClick={fetchBoards.bind(null, workspaceId)}>
                Refresh
              </button>
              <button className="btn btn-primary" onClick={() => { setError(''); setBoardOpen(true); }}>
                New board
              </button>
            </div>
          </div>

          {amOwner && currentWorkspace?.inviteCode && (
            <div
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                marginBottom: 20,
                padding: '12px 16px',
              }}
            >
              <div>
                <strong style={{ fontSize: 13 }}>Invite code</strong>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Share this code so teammates can join the workspace via the dashboard.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code
                  style={{
                    padding: '8px 12px',
                    background: '#f3f4f6',
                    borderRadius: 8,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  {currentWorkspace.inviteCode}
                </code>
                <button className="btn btn-sm" onClick={copyInvite}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button className="btn btn-sm" onClick={regenerateInvite} title="Regenerate code">
                  ↻
                </button>
              </div>
            </div>
          )}

          {boards.length === 0 ? (
            <div className="empty-state card">
              <p>No boards in this workspace yet.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              {boards.map((b) => (
                <button
                  key={b._id}
                  className="card"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => navigate(`/b/${b._id}`)}
                >
                  <h3 style={{ fontSize: 16 }}>{b.name}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0 0' }}>
                    {b.description || 'No description'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Workspace">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmitCreate}>
          <div className="form-group">
            <label>Name</label>
            <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={3}
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </form>
      </Modal>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join Workspace">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmitJoin}>
          <div className="form-group">
            <label>Invite code</label>
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="e.g. ACME123" required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Joining…' : 'Join'}
          </button>
        </form>
      </Modal>

      <Modal open={boardOpen} onClose={() => setBoardOpen(false)} title="Create Board">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmitBoard}>
          <div className="form-group">
            <label>Name</label>
            <input name="name" value={boardForm.name} onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={boardForm.description} onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
