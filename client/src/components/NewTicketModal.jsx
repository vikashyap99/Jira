import { useState } from 'react';
import api from '../api/client';
import Modal from './Modal';
import useTicketStore from '../store/ticketStore';
import useBoardStore from '../store/boardStore';
import { PRIORITY_LABELS, getErrorMessage } from '../utils/helpers';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function NewTicketModal({ onCreated }) {
  const { newTicket, closeNewTicket } = useTicketStore();
  const { members, addTicket } = useBoardStore();

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    labels: '',
    dueDate: '',
    assignees: [],
  });
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setForm({ title: '', description: '', priority: 'medium', labels: '', dueDate: '', assignees: [] });
    setAttachments([]);
    setError('');
  };

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" exceeds the 5 MB limit`);
        continue;
      }
      const url = await readFileAsDataUrl(file);
      setAttachments((prev) => [...prev, { name: file.name, url, size: file.size }]);
    }
    e.target.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAssignee = (id) => {
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(id)
        ? f.assignees.filter((x) => x !== id)
        : [...f.assignees, id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/tickets', {
        board: newTicket.board,
        column: newTicket.column,
        title: form.title,
        description: form.description,
        priority: form.priority,
        labels: form.labels ? form.labels.split(',').map((l) => l.trim()).filter(Boolean) : [],
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        assignees: form.assignees,
        attachments: attachments.map((a) => ({ name: a.name, url: a.url, size: a.size })),
      });
      addTicket(res.data.data.ticket);
      reset();
      closeNewTicket();
      if (onCreated) onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create ticket'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!newTicket} onClose={() => { reset(); closeNewTicket(); }} title="New Ticket" width="560px">
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            rows={3}
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
                  background: form.assignees.includes(m.user.id) ? '#eef2ff' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.assignees.includes(m.user.id)}
                  onChange={() => toggleAssignee(m.user.id)}
                  style={{ margin: 0 }}
                />
                <span>{m.user.firstName || m.user.email}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Attachments (PNG, images, video, audio)</label>
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={onFiles}
            style={{ width: '100%' }}
          />
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {attachments.map((a, i) => (
                <div
                  key={`${a.name}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 6,
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    maxWidth: '100%',
                  }}
                >
                  {/^data:image\//.test(a.url) ? (
                    <img
                      src={a.url}
                      alt={a.name}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: 6,
                        background: '#f3f4f6',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 22, lineHeight: 1 }}>🎥</span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 160 }}>
                    {a.name.length > 24 ? a.name.slice(0, 24) + '…' : a.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                    aria-label={`Remove ${a.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </Modal>
  );
}
