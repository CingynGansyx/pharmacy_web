import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Дашбоард', end: true },
  { to: '/medicines', label: 'Эм' },
  { to: '/customers', label: 'Хэрэглэгчид' },
  { to: '/reports', label: 'Тайлан' },
  { to: '/analytics', label: 'Аналитик' },
  { to: '/import', label: 'Импорт' },
];

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
          <h2>Pharmacy</h2>
          <span className="user-name">{user?.fullName}</span>
        </div>

        <ul className="nav-links">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.end}>{n.label}</NavLink>
            </li>
          ))}
        </ul>

        <button className="logout-btn" onClick={handleLogout}>Гарах</button>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
