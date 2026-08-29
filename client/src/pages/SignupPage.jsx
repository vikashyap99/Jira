import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await signup({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      });
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Signup failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: 420 }}>
        <h2 style={{ marginBottom: 4 }}>Create account</h2>
        <p style={{ color: 'var(--muted)', marginTop: 0, marginBottom: 20 }}>Start managing your projects</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={onChange} required placeholder="you@example.com" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>First name</label>
              <input type="text" name="firstName" value={form.firstName} onChange={onChange} placeholder="Jane" />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input type="text" name="lastName" value={form.lastName} onChange={onChange} placeholder="Doe" />
            </div>
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input type="tel" name="phone" value={form.phone} onChange={onChange} placeholder="+1 555 000 0000" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={onChange} required placeholder="At least 8 characters" />
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={onChange} required placeholder="Re-enter password" />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', color: 'var(--muted)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
