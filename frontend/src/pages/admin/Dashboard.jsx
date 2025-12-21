import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, GraduationCap, FileText,
  AlertCircle, Clock, Database, TrendingUp,
  BarChart3, Shield, Settings, Bell
} from 'lucide-react';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard');
      
      if (response.data.success) {
        const data = response.data.data;
        setStats(data.stats);
        setRecentResults(data.recentResults);
        setTopStudents(data.topStudents);
        setGradeDistribution(data.gradeDistribution);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: <Users className="h-8 w-8" />,
      color: 'bg-blue-500',
      path: '/admin/users'
    },
    {
      title: 'Total Students',
      value: stats?.students || 0,
      icon: <GraduationCap className="h-8 w-8" />,
      color: 'bg-green-500',
      path: '/admin/students'
    },
    {
      title: 'Teachers',
      value: stats?.teachers || 0,
      icon: <Users className="h-8 w-8" />,
      color: 'bg-purple-500',
      path: '/admin/teachers'
    },
    {
      title: 'Subjects',
      value: stats?.subjects || 0,
      icon: <BookOpen className="h-8 w-8" />,
      color: 'bg-yellow-500',
      path: '/admin/subjects'
    },
    {
      title: 'Published Results',
      value: stats?.publishedResults || 0,
      icon: <FileText className="h-8 w-8" />,
      color: 'bg-teal-500',
      path: '/admin/results'
    },
    {
      title: 'Pending Results',
      value: stats?.pendingResults || 0,
      icon: <AlertCircle className="h-8 w-8" />,
      color: 'bg-orange-500',
      path: '/admin/results/pending'
    },
    {
      title: 'Recent Logins',
      value: stats?.recentLogins || 0,
      icon: <Clock className="h-8 w-8" />,
      color: 'bg-indigo-500',
      path: '/admin/audit-logs'
    },
    {
      title: 'Database Size',
      value: stats?.databaseSize || '0 MB',
      icon: <Database className="h-8 w-8" />,
      color: 'bg-red-500',
      path: '/admin/backup'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, Administrator!</h1>
        <p className="text-teal-100 mt-2">Manage the entire student result system from one dashboard.</p>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span>System Status: <span className="font-semibold">Operational</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>Uptime: <span className="font-semibold">{stats?.systemHealth?.uptime || '99.9%'}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/admin/users/create')}
          className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold">Add New User</h3>
              <p className="text-sm text-gray-500">Create student/teacher account</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => navigate('/admin/notices/create')}
          className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Publish Notice</h3>
              <p className="text-sm text-gray-500">Create new announcement</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => navigate('/admin/results/publish')}
          className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Publish Results</h3>
              <p className="text-sm text-gray-500">Approve & publish results</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => navigate('/admin/settings')}
          className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">System Settings</h3>
              <p className="text-sm text-gray-500">Configure system</p>
            </div>
          </div>
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(card.path)}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg text-white`}>
                {card.icon}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-400">Click to manage</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Results & Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Published Results */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Published Results</h2>
            <button
              onClick={() => navigate('/admin/results')}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            {recentResults.length > 0 ? (
              recentResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{result.student_name}</p>
                    <p className="text-sm text-gray-500">{result.roll_no} • {result.program}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">GPA: {result.gpa}</p>
                    <p className="text-sm text-gray-500">{result.grade}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No results published yet</p>
            )}
          </div>
        </div>

        {/* Top Performing Students */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Top Performing Students</h2>
            <TrendingUp className="h-5 w-5 text-teal-600" />
          </div>
          <div className="space-y-4">
            {topStudents.length > 0 ? (
              topStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-700 rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-sm text-gray-500">{student.roll_no}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{student.gpa}</p>
                    <p className="text-sm text-teal-600">Rank #{student.rank}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No student data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Grade Distribution</h2>
          <BarChart3 className="h-5 w-5 text-teal-600" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {gradeDistribution.map((item, index) => {
            const percentage = item.percentage || 0;
            return (
              <div key={index} className="text-center">
                <div className="relative h-40">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10">
                    <div
                      className="bg-teal-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${percentage * 2}px` }}
                    ></div>
                  </div>
                </div>
                <p className="font-bold mt-2">{item.grade}</p>
                <p className="text-sm text-gray-500">{item.count} students</p>
                <p className="text-xs text-teal-600">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Health */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">System Health Monitor</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-300">Server Uptime</p>
            <p className="text-xl font-bold text-green-400">{stats?.systemHealth?.uptime || '99.9%'}</p>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-300">Memory Usage</p>
            <p className="text-xl font-bold text-blue-400">
              {stats?.systemHealth?.memory 
                ? `${Math.round(stats.systemHealth.memory.heapUsed / 1024 / 1024)} MB` 
                : 'N/A'}
            </p>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-300">Database Status</p>
            <p className="text-xl font-bold text-green-400">Connected ✓</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;