import React, { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, BookOpen, TrendingUp, 
  FileText, Settings, Download, Bell
} from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import PerformanceChart from '../../components/charts/PerformanceChart';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Announcements from '../../components/dashboard/Announcements';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    passPercentage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Add New Student', icon: <Users />, path: '/admin/students/add' },
    { title: 'Add Teacher', icon: <GraduationCap />, path: '/admin/teachers/add' },
    { title: 'Manage Subjects', icon: <BookOpen />, path: '/admin/subjects' },
    { title: 'Generate Reports', icon: <FileText />, path: '/admin/reports' },
    { title: 'System Settings', icon: <Settings />, path: '/admin/settings' },
    { title: 'Export Data', icon: <Download />, path: '/admin/export' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your system.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Create Announcement
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users className="h-8 w-8" />}
          color="blue"
          change="+12 this month"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={<GraduationCap className="h-8 w-8" />}
          color="green"
          change="+2 this month"
        />
        <StatCard
          title="Total Subjects"
          value={stats.totalSubjects}
          icon={<BookOpen className="h-8 w-8" />}
          color="purple"
          change="Active: 15"
        />
        <StatCard
          title="Pass Percentage"
          value={`${stats.passPercentage}%`}
          icon={<TrendingUp className="h-8 w-8" />}
          color="orange"
          change="+5.2% from last sem"
        />
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Overview</h2>
            <PerformanceChart />
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.path}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    {action.icon}
                  </div>
                  <span className="font-medium text-gray-700">{action.title}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <Announcements />
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">System Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-green-600">99.9%</div>
            <div className="text-sm text-gray-600">Uptime</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-blue-600">1.2s</div>
            <div className="text-sm text-gray-600">Avg Response</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-purple-600">256</div>
            <div className="text-sm text-gray-600">Active Sessions</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-orange-600">5.2GB</div>
            <div className="text-sm text-gray-600">Database Size</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;