import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageCircle, 
  Users, 
  UserCheck, 
  MessageSquare, 
  Phone, 
  Activity,
  Settings,
  UserPlus
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/chat', icon: MessageCircle, label: 'Chats' },
    { path: '/social', icon: Users, label: 'Social' },
    { path: '/follow-requests', icon: UserCheck, label: 'Follow Requests' },
    { path: '/message-requests', icon: MessageSquare, label: 'Message Requests' },
    { path: '/status', icon: Activity, label: 'Status' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-secondary-200 min-h-screen">
      <div className="p-6">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600' 
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-secondary-200">
          <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors">
              <UserPlus className="h-4 w-4" />
              <span>Find People</span>
            </button>
            <button className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors">
              <Phone className="h-4 w-4" />
              <span>Start Call</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

