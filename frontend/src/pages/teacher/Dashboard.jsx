import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Users, BookOpen, FileText, Edit,
  BarChart3, Clock, CheckCircle, AlertCircle,
  Trophy, Award, Star, TrendingUp
} from 'lucide-react';

const TeacherDashboard = () => {
  const { user, sidebarOpen } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teachers/dashboard');
      setDashboardData(response.data.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: 'My Subjects',
      value: dashboardData?.stats?.total_subjects || 0,
      icon: BookOpen,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Total Students',
      value: dashboardData?.stats?.total_students || 0,
      icon: Users,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Average Marks',
      value: dashboardData?.stats?.average_marks 
        ? `${dashboardData.stats.average_marks.toFixed(1)}%`
        : 'N/A',
      icon: BarChart3,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Graded Students',
      value: dashboardData?.stats?.students_graded || 0,
      icon: CheckCircle,
      color: 'from-amber-500 to-orange-500'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50">
      <Sidebar isOpen={sidebarOpen} />
      
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <Header />
        
        <main className="p-4 lg:p-6">
          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-secondary-500 to-primary-500 rounded-2xl p-6 text-white shadow-elevated mb-6"
          >
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="mb-4 lg:mb-0">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Welcome, {user?.name}! 👨‍🏫</h1>
                <p className="text-primary-100">
                  Manage your subjects and enter marks for your students.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-sm text-primary-200">Department</p>
                  <p className="text-lg font-bold">{user?.department || 'Computer Science'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-card border border-neutral-100 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 bg-gradient-to-br ${stat.color} rounded-lg shadow-sm`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
                  <p className="text-sm text-neutral-600">{stat.title}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pending Subjects for Marks Entry */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">Pending Marks Entry</h3>
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-4">
                {dashboardData?.pendingSubjects?.map((subject, index) => {
                  const completion = subject.total_enrolled 
                    ? Math.round((subject.marks_entered / subject.total_enrolled) * 100)
                    : 0;
                  
                  return (
                    <div
                      key={index}
                      className="p-4 border border-neutral-100 rounded-xl hover:border-primary-200 hover:bg-primary-50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-neutral-900">{subject.name}</p>
                          <p className="text-sm text-neutral-600">{subject.code} • {subject.credit} Credits</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-neutral-900">
                            {subject.marks_entered}/{subject.total_enrolled}
                          </span>
                          <p className="text-xs text-neutral-600">Students</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-neutral-600">Completion</span>
                          <span className="text-xs font-medium text-neutral-900">{completion}%</span>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              completion >= 80 ? 'bg-green-500' :
                              completion >= 50 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                      </div>
                      <button className="w-full mt-3 btn-outline text-sm py-2">
                        <Edit className="w-4 h-4 mr-2 inline" />
                        Enter Marks
                      </button>
                    </div>
                  );
                })}
                {(!dashboardData?.pendingSubjects || dashboardData.pendingSubjects.length === 0) && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-neutral-500">All marks have been entered!</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Marks Added */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">Recent Marks Added</h3>
                <Clock className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="space-y-3">
                {dashboardData?.recentMarks?.slice(0, 5).map((mark, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        mark.marks_obtained >= 80 ? 'bg-green-100 text-green-700' :
                        mark.marks_obtained >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <span className="font-bold text-sm">{mark.marks_obtained}</span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 text-sm">{mark.student_name}</p>
                        <p className="text-xs text-neutral-600">{mark.subject_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-600">{mark.exam_type}</p>
                      <p className="text-xs text-neutral-500">
                        {new Date(mark.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(!dashboardData?.recentMarks || dashboardData.recentMarks.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No marks entered yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Edit className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Enter Marks</h4>
                  <p className="text-sm text-neutral-600">For your subjects</p>
                </div>
              </div>
              <button className="w-full btn-primary text-sm py-2">
                Start Entry
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900">View Results</h4>
                  <p className="text-sm text-neutral-600">Check student performance</p>
                </div>
              </div>
              <button className="w-full btn-outline text-sm py-2">
                View Results
              </button>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Analytics</h4>
                  <p className="text-sm text-neutral-600">Subject-wise analysis</p>
                </div>
              </div>
              <button className="w-full btn-secondary text-sm py-2">
                View Analytics
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;