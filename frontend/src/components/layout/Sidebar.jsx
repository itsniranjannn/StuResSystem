import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    Home, Users, BookOpen, BarChart3, User, Settings,
    LogOut, ChevronLeft, ChevronRight, GraduationCap,
    Award, FileText, Calendar, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();

    const adminNavItems = [
        { title: 'Dashboard', icon: <Home size={20} />, path: '/admin/dashboard' },
        { title: 'Students', icon: <Users size={20} />, path: '/admin/students' },
        { title: 'Teachers', icon: <GraduationCap size={20} />, path: '/admin/teachers' },
        { title: 'Subjects', icon: <BookOpen size={20} />, path: '/admin/subjects' },
        { title: 'Results', icon: <Award size={20} />, path: '/admin/results' },
        { title: 'Analytics', icon: <BarChart3 size={20} />, path: '/admin/analytics' },
        { title: 'Users', icon: <Shield size={20} />, path: '/admin/users' },
        { title: 'Settings', icon: <Settings size={20} />, path: '/admin/settings' },
    ];

    const teacherNavItems = [
        { title: 'Dashboard', icon: <Home size={20} />, path: '/teacher/dashboard' },
        { title: 'My Students', icon: <Users size={20} />, path: '/teacher/students' },
        { title: 'Subjects', icon: <BookOpen size={20} />, path: '/teacher/subjects' },
        { title: 'Marks Entry', icon: <FileText size={20} />, path: '/teacher/marks' },
        { title: 'Results', icon: <Award size={20} />, path: '/teacher/results' },
        { title: 'Schedule', icon: <Calendar size={20} />, path: '/teacher/schedule' },
        { title: 'Profile', icon: <User size={20} />, path: '/teacher/profile' },
    ];

    const studentNavItems = [
        { title: 'Dashboard', icon: <Home size={20} />, path: '/student/dashboard' },
        { title: 'My Results', icon: <Award size={20} />, path: '/student/results' },
        { title: 'Subjects', icon: <BookOpen size={20} />, path: '/student/subjects' },
        { title: 'Marks', icon: <FileText size={20} />, path: '/student/marks' },
        { title: 'Ranking', icon: <BarChart3 size={20} />, path: '/student/ranking' },
        { title: 'Profile', icon: <User size={20} />, path: '/student/profile' },
    ];

    const getNavItems = () => {
        switch (user?.role) {
            case 'admin': return adminNavItems;
            case 'teacher': return teacherNavItems;
            case 'student': return studentNavItems;
            default: return [];
        }
    };

    const navItems = getNavItems();

    return (
        <>
            <div className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
                {/* Logo */}
                <div className="flex items-center h-16 px-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center">
                            <Award className="h-5 w-5 text-white" />
                        </div>
                        {!collapsed && (
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Result System</h1>
                                <p className="text-xs text-gray-500">{user?.role?.toUpperCase()}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`
                                    flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }
                                    ${collapsed ? 'justify-center' : ''}
                                `}
                                title={collapsed ? item.title : ''}
                            >
                                <span className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {item.icon}
                                </span>
                                {!collapsed && (
                                    <span className="ml-3">{item.title}</span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* User profile & logout */}
                <div className={`border-t border-gray-200 p-4 ${collapsed ? 'px-2' : 'px-4'}`}>
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                        )}
                    </div>
                    
                    {!collapsed && (
                        <button
                            onClick={logout}
                            className="mt-4 w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </button>
                    )}
                </div>

                {/* Collapse button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-24 h-6 w-6 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-400 transition-colors"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>
        </>
    );
};

export default Sidebar;