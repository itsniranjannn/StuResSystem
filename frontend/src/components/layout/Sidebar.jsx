import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, User, FileText, Users, GraduationCap,
  BookOpen, Trophy, Bell, Settings, BarChart3, LineChart,
  UserCog, Edit, LogOut, ChevronLeft, ChevronRight,
  Home, School, Database, Shield
} from 'lucide-react';
import { useAuth, getNavigationByRole } from '../../context/AuthContext';

const iconComponents = {
  LayoutDashboard, User, FileText, Users, GraduationCap,
  BookOpen, Trophy, Bell, Settings, BarChart3, LineChart,
  UserCog, Edit, Home, School, Database, Shield
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, toggleSidebar } = useAuth();
  
  if (!user) return null;
  
  const navigation = getNavigationByRole(user.role);
  
  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-white to-neutral-50 shadow-2xl border-r border-neutral-200 flex flex-col transform lg:translate-x-0"
      >
        {/* Logo */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl shadow-lg">
                <School className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Result System</h2>
                <p className="text-xs text-neutral-600">TU BCA</p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 truncate">{user?.name}</p>
              <p className="text-sm text-neutral-600 capitalize">{user?.role}</p>
              {user?.roll_no && (
                <p className="text-xs text-neutral-500 truncate">{user.roll_no}</p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item, index) => {
            const Icon = iconComponents[item.icon];
            return (
              <NavLink
                key={index}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 border border-primary-200 shadow-sm'
                      : 'text-neutral-700 hover:text-primary-700 hover:bg-primary-50'
                  }`
                }
              >
                {Icon && (
                  <Icon className={`w-5 h-5 transition-colors ${
                    window.location.pathname === item.path
                      ? 'text-primary-600'
                      : 'text-neutral-400 group-hover:text-primary-500'
                  }`} />
                )}
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* System Info */}
        <div className="p-4 border-t border-neutral-200">
          <div className="bg-gradient-to-r from-neutral-50 to-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-medium text-neutral-700">System Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-neutral-600">All systems operational</span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-danger-600 hover:bg-danger-50 rounded-xl transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 text-danger-500 group-hover:text-danger-600" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;