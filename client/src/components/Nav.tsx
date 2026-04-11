import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/planner',  icon: '🌿', label: 'Garden'   },
  { to: '/calendar', icon: '📅', label: 'Schedule' },
  { to: '/seeds',    icon: '🌱', label: 'Seeds'    },
  { to: '/log',      icon: '📋', label: 'Log'      },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export function Nav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
