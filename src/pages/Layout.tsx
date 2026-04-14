import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>Эмийн сан</h2>
          <span className="user-name">{user?.fullName}</span>
        </div>

        <ul className="nav-links">
          <li>
            <NavLink to="/" end>
              Эм жагсаалт
            </NavLink>
          </li>
          <li>
            <NavLink to="/import">Excel оруулах</NavLink>
          </li>
        </ul>

        <button className="logout-btn" onClick={handleLogout}>
          Гарах
        </button>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
