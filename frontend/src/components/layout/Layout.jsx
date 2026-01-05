import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const Layout = () => {
  const { user } = useAuth();

  // Get role-specific layout configuration
  const getLayoutConfig = () => {
    switch(user?.role) {
      case 'admin':
        return {
          sidebarItems: [
            { title: 'Dashboard', path: '/admin/dashboard', icon: '🏠' },
            { title: 'Users', path: '/admin/users', icon: '👥' },
            { title: 'Students', path: '/admin/students', icon: '🎓' },
            { title: 'Teachers', path: '/admin/teachers', icon: '👨‍🏫' },
            { title: 'Subjects', path: '/admin/subjects', icon: '📚' },
            { title: 'Results', path: '/admin/results', icon: '📊' },
            { title: 'Reports', path: '/admin/reports', icon: '📈' },
            { title: 'Settings', path: '/admin/settings', icon: '⚙️' }
          ],
          headerTitle: 'Admin Panel'
        };
      case 'teacher':
        return {
          sidebarItems: [
            { title: 'Dashboard', path: '/teacher/dashboard', icon: '🏠' },
            { title: 'My Students', path: '/teacher/students', icon: '🎓' },
            { title: 'Enter Marks', path: '/teacher/marks', icon: '✏️' },
            { title: 'Attendance', path: '/teacher/attendance', icon: '📅' },
            { title: 'Subjects', path: '/teacher/subjects', icon: '📚' },
            { title: 'Results', path: '/teacher/results', icon: '📊' },
            { title: 'Profile', path: '/teacher/profile', icon: '👤' }
          ],
          headerTitle: 'Teacher Portal'
        };
      case 'student':
        return {
          sidebarItems: [
            { title: 'Dashboard', path: '/student/dashboard', icon: '🏠' },
            { title: 'My Results', path: '/student/results', icon: '📊' },
            { title: 'Attendance', path: '/student/attendance', icon: '📅' },
            { title: 'Subjects', path: '/student/subjects', icon: '📚' },
            { title: 'Profile', path: '/student/profile', icon: '👤' },
            { title: 'Ranking', path: '/student/ranking', icon: '🥇' },
            { title: 'Marksheet', path: '/student/marksheet', icon: '📄' }
          ],
          headerTitle: 'Student Portal'
        };
      default:
        return { sidebarItems: [], headerTitle: 'Dashboard' };
    }
  };

  const layoutConfig = getLayoutConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar items={layoutConfig.sidebarItems} />
        <div className="flex-1">
          <Header title={layoutConfig.headerTitle} />
          <main className="p-6">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Layout;