import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    avatarUrl: user.avatarUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await api.put('/auth/me', form);
      updateUser(res.data.data.user);
      setMessage('Profile updated');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1 style={{ marginBottom: 20 }}>Profile</h1>
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>First name</label>
              <input name="firstName" value={form.firstName} onChange={onChange} />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input name="lastName" value={form.lastName} onChange={onChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} placeholder="+1 555 000 0000" />
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
              Phone is not used for login yet, but is stored for future phone/OTP support.
            </p>
          </div>
          <div className="form-group">
            <label>Avatar URL</label>
            <input name="avatarUrl" value={form.avatarUrl} onChange={onChange} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
