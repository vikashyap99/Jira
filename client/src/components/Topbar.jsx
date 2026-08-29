import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <Link to="/" className="logo">
        Jira
      </Link>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit' }}>
            <Avatar user={user} size={30} />
            <span>{user.firstName || user.email}</span>
          </Link>
          <button className="btn btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
