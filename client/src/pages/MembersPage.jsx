import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { getErrorMessage } from '../utils/helpers';

const ROLE_BADGE = {
  owner: { bg: '#ede9fe', color: '#5b21b6' },
  reviewer: { bg: '#dbeafe', color: '#1e40af' },
  member: { bg: '#e5e7eb', color: '#374151' },
};

export default function MembersPage() {
  const { workspaceId } = useParams();
  const { user: authUser } = useAuth();
  const { currentWorkspace, fetchWorkspace } = useWorkspaceStore();
  const [members, setMembers] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const myId = String(authUser?._id || '');
  const myMember = members.find((m) => String(m.user.id) === myId);
  const amOwner = myMember?.role === 'owner';

  const loadMembers = async () => {
    setLoading(true);
    try {
      const [wsRes, memRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get(`/workspaces/${workspaceId}/members`),
      ]);
      setMembers(memRes.data.data.members);
      await fetchWorkspace(workspaceId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const onInvite = async (e) => {
    e.preventDefault();
    setError('');
    setInviting(true);
    try {
      await api.post(`/workspaces/${workspaceId}/members`, inviteForm);
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'member' });
      await loadMembers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to invite member'));
    } finally {
      setInviting(false);
    }
  };

  const onChangeRole = async (member, role) => {
    try {
      await api.put(`/workspaces/${workspaceId}/members/${member.memberId}`, { role });
      await loadMembers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update role'));
    }
  };

  const onRemove = async (member) => {
    if (!window.confirm(`Remove ${member.user.firstName || member.user.email}?`)) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${member.memberId}`);
      await loadMembers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove member'));
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Link to={`/w/${workspaceId}`} style={{ fontSize: 13, color: 'var(--muted)' }}>
            ← Back to {currentWorkspace?.name}
          </Link>
          <h1 style={{ marginTop: 4 }}>Members</h1>
        </div>
        {amOwner && (
          <button className="btn btn-primary" onClick={() => { setError(''); setInviteOpen(true); }}>
            Invite member
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {members.length === 0 ? (
          <div className="empty-state">
            <p>No members found.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>User</th>
                <th style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>Role</th>
                {amOwner && <th style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.memberId} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar user={m.user} size={32} />
                      <div>
                        <div>{m.user.firstName || m.user.lastName || 'Unnamed'}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{m.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      className="badge"
                      style={{ background: ROLE_BADGE[m.role].bg, color: ROLE_BADGE[m.role].color }}
                    >
                      {m.role}
                    </span>
                  </td>
                  {amOwner && (
                    <td style={{ padding: '12px 16px' }}>
                      {String(m.user.id) !== String(myId) ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select
                            value={m.role}
                            onChange={(e) => onChangeRole(m, e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
                          >
                            <option value="owner">owner</option>
                            <option value="reviewer">reviewer</option>
                            <option value="member">member</option>
                          </select>
                          <button className="btn btn-sm btn-danger" onClick={() => onRemove(m)}>
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 13 }}>You</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Member">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onInvite}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              <option value="member">member</option>
              <option value="reviewer">reviewer</option>
              <option value="owner">owner</option>
            </select>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={inviting}>
            {inviting ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
