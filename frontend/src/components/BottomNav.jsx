import React from 'react';
import { Home, Map, Navigation, Bell, Activity, User, Cloud, Camera, Route } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { name: 'Home',      icon: Home,       path: '/home'      },
  { name: 'Map',       icon: Map,        path: '/map'       },
  { name: 'Routes',    icon: Navigation, path: '/routes'    },
  { name: 'Weather',   icon: Cloud,      path: '/weather'   },
  { name: 'Camera',    icon: Camera,     path: '/camera'    },
  { name: 'Analytics', icon: Activity,   path: '/analytics' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="bottom-nav">
      {NAV_ITEMS.map(({ name, icon: Icon, path }) => {
        const isActive = location.pathname === path || (location.pathname === '/' && path === '/home');
        return (
          <div key={name} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => navigate(path)}>
            <Icon size={20} className="nav-icon" />
            <span className="nav-text">{name}</span>
          </div>
        );
      })}
    </div>
  );
};

export default BottomNav;
