import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from './Modal';
import { Avatar } from './Avatar';
import Spinner from './Spinner';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_LABELS, PRIORITY_CLASS, formatDate, getErrorMessage } from '../utils/helpers';

export default function TicketDetail({ ticketId, boardId, onClose, onRefresh, members }) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [commentBody, setCommentBody] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [tRes, cRes] = await Promise.all([
          api.get(`/tickets/${ticketId}`),
          api.get(`/tickets/${ticketId}/comments`),
        ]);
        if (!mounted) return;
        setTicket(tRes.data.data.ticket);
        setComments(cRes.data.data.comments);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load ticket'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [ticketId]);

  const startEdit = () => {
    setForm({
      title: ticket.title,
      description: ticket.description || '',
      priority: ticket.priority,
      labels: ticket.labels?.join(', ') || '',
      dueDate: ticket.dueDate ? ticket.dueDate.slice(0, 10) : '',
      assignees: ticket.assignees?.map((a) => a._id) || [],
    });
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        labels: form.labels
          ? form.labels.split(',').map((l) => l.trim()).filter(Boolean)
          : [],
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        assignees: form.assignees || [],
      };
      const res = await api.put(`/tickets/${ticketId}`, payload);
      setTicket(res.data.data.ticket);
      setEditing(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save ticket'));
    } finally {
      setSaving(false);
    }
  };

  const deleteTicket = async () => {
    if (!window.confirm('Delete this ticket?')) return;
    try {
      await api.delete(`/tickets/${ticketId}`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete ticket'));
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    try {
      const res = await api.post(`/tickets/${ticketId}/comments`, { body: commentBody });
      setComments([...comments, res.data.data.comment]);
      setCommentBody('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to post comment'));
    }
  };

  const toggleAssignee = (id) => {
    setForm((f) => {
      const current = f.assignees || [];
      return {
        ...f,
        assignees: current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      };
    });
  };

  const isWatching = (ticket?.watchers || []).some((w) => String(w._id || w) === String(user?._id));

  const toggleWatch = async () => {
    try {
      const res = await api.put(`/tickets/${ticketId}/watch`);
      setTicket(res.data.data.ticket);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update watch status'));
    }
  };

  return (
    <Modal open onClose={onClose} title={ticket?.title || 'Ticket'} width="720px">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size={28} />
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <div>
          {editing ? (
            <form onSubmit={saveEdit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Labels (comma separated)</label>
                <input
                  value={form.labels}
                  onChange={(e) => setForm({ ...form, labels: e.target.value })}
                  placeholder="frontend, bug"
                />
              </div>
              <div className="form-group">
                <label>Assignees</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {members.map((m) => (
                    <label
                      key={m.user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: form.assignees?.includes(m.user.id) ? '#eef2ff' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.assignees?.includes(m.user.id)}
                        onChange={() => toggleAssignee(m.user.id)}
                        style={{ margin: 0 }}
                      />
                      <span>{m.user.firstName || m.user.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <span className={`badge ${PRIORITY_CLASS[ticket.priority]}`}>
                    {PRIORITY_LABELS[ticket.priority]}
                  </span>
                  {ticket.labels?.map((l) => (
                    <span key={l} className="badge" style={{ background: '#f3f4f6' }}>
                      #{l}
                    </span>
                  ))}
                  {ticket.dueDate && <span className="badge" style={{ background: '#fef3c7' }}>📅 {formatDate(ticket.dueDate)}</span>}
                </div>
                <button
                  className={`btn btn-sm ${isWatching ? 'btn-primary' : ''}`}
                  onClick={toggleWatch}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isWatching ? '👁 Watching' : '👁 Watch'}
                </button>
              </div>

              <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 16px', color: '#374151' }}>
                {ticket.description || 'No description provided.'}
              </p>

              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 13 }}>Assignees</strong>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  {ticket.assignees?.length ? (
                    ticket.assignees.map((a) => (
                      <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar user={a} size={26} />
                        <span style={{ fontSize: 13 }}>{a.firstName || a.email}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>Unassigned</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 13 }}>Reporter</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Avatar user={ticket.reporter} size={26} />
                  <span style={{ fontSize: 13 }}>{ticket.reporter?.firstName || ticket.reporter?.email || 'Unknown'}</span>
                </div>
              </div>

              {(ticket.watchers?.length > 0 || isWatching) && (
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ fontSize: 13 }}>Watchers ({ticket.watchers?.length || 1})</strong>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {ticket.watchers?.map((w) => (
                      <div key={w._id || w} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar user={w} size={24} />
                        <span style={{ fontSize: 12 }}>{w.firstName || w.email || 'User'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

              {ticket.statusHistory?.length > 0 && (
                <>
                  <strong style={{ fontSize: 13 }}>Activity</strong>
                  <div style={{ margin: '10px 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(ticket.statusHistory || []).map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                        <span>🔄</span>
                        <div>
                          <span>
                            <strong>{h.changedBy?.firstName || h.changedBy?.email || 'Someone'}</strong>{' '}
                            moved to <strong>{h.column || 'a column'}</strong>
                          </span>
                          <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 12 }}>
                            {formatDate(h.changedAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 20px' }} />
                </>
              )}

              <strong style={{ fontSize: 13 }}>Comments ({comments.length})</strong>
              <div style={{ margin: '10px 0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.length === 0 && (
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>No comments yet.</span>
                )}
                {comments.map((c) => (
                  <div key={c._id} style={{ display: 'flex', gap: 10 }}>
                    <Avatar user={c.author} size={28} />
                    <div>
                      <div style={{ fontSize: 13 }}>
                        <strong>{c.author?.firstName || c.author?.email}</strong>
                        <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 12 }}>
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: '#374151' }}>{c.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={submitComment} style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ flex: 1 }}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Write a comment…"
                />
                <button className="btn btn-primary" type="submit" disabled={!commentBody.trim()}>
                  Post
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button className="btn btn-danger" onClick={deleteTicket}>
                  Delete ticket
                </button>
                <button className="btn btn-primary" onClick={startEdit}>
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
