import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  BookOpen, FileText, Trophy, TrendingUp,
  Award, Star, Calendar, Download,
  CheckCircle, AlertCircle, Clock, Users
} from 'lucide-react';

const StudentDashboard = () => {
  const { user, sidebarOpen } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/results', {
        params: {
          student_id: user?.id,
          status: 'published'
        }
      });
      setDashboardData(response.data.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: 'Current GPA',
      value: dashboardData?.[0]?.gpa?.toFixed(2) || 'N/A',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Class Rank',
      value: dashboardData?.[0]?.rank ? `#${dashboardData[0].rank}` : 'N/A',
      icon: Trophy,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Total Subjects',
      value: '5',
      icon: BookOpen,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Overall Grade',
      value: dashboardData?.[0]?.grade || 'N/A',
      icon: Award,
      color: 'from-amber-500 to-orange-500'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading student dashboard...</p>
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
            className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl p-6 text-white shadow-elevated mb-6"
          >
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="mb-4 lg:mb-0">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Welcome, {user?.name}! 👨‍🎓</h1>
                <p className="text-primary-100">
                  Check your academic performance and results here.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-sm text-primary-200">Roll Number</p>
                  <p className="text-lg font-bold">{user?.roll_no || 'N/A'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-sm text-primary-200">Program</p>
                  <p className="text-lg font-bold">{user?.program || 'BCA'}</p>
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
            {/* Recent Results */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">Recent Results</h3>
                <FileText className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="space-y-4">
                {dashboardData?.slice(0, 5).map((result, index) => (
                  <div
                    key={index}
                    className="p-4 border border-neutral-100 rounded-xl hover:border-primary-200 hover:bg-primary-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-neutral-900">
                          Semester {result.semester} Results
                        </p>
                        <p className="text-sm text-neutral-600">
                          Academic Year: {result.exam_year}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`badge ${
                          result.grade === 'A+' || result.grade === 'A' ? 'badge-success' :
                          result.grade === 'B+' || result.grade === 'B' ? 'badge-primary' :
                          result.grade === 'C+' || result.grade === 'C' ? 'badge-warning' :
                          'badge-danger'
                        }`}>
                          {result.grade}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="text-center p-2 bg-neutral-50 rounded-lg">
                        <p className="text-xs text-neutral-600">GPA</p>
                        <p className="text-lg font-bold text-neutral-900">{result.gpa.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-2 bg-neutral-50 rounded-lg">
                        <p className="text-xs text-neutral-600">Rank</p>
                        <p className="text-lg font-bold text-neutral-900">#{result.rank}</p>
                      </div>
                    </div>
                    <button className="w-full mt-3 btn-outline text-sm py-2">
                      <Download className="w-4 h-4 mr-2 inline" />
                      Download Marksheet
                    </button>
                  </div>
                ))}
                {(!dashboardData || dashboardData.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No results published yet</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Subject-wise Performance */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">Subject Performance</h3>
                <BarChart3 className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="space-y-3">
                {[
                  { subject: 'Web Technology', marks: 85, grade: 'A' },
                  { subject: 'Database Management', marks: 78, grade: 'B+' },
                  { subject: 'Software Engineering', marks: 92, grade: 'A+' },
                  { subject: 'Computer Graphics', marks: 68, grade: 'B' },
                  { subject: 'Project Work', marks: 88, grade: 'A' }
                ].map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        subject.marks >= 80 ? 'bg-green-100 text-green-700' :
                        subject.marks >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <span className="font-bold text-sm">{subject.marks}</span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 text-sm">{subject.subject}</p>
                        <p className="text-xs text-neutral-600">3 Credits</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`badge ${
                        subject.grade === 'A+' || subject.grade === 'A' ? 'badge-success' :
                        subject.grade === 'B+' || subject.grade === 'B' ? 'badge-primary' :
                        'badge-warning'
                      }`}>
                        {subject.grade}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-secondary-500 to-primary-500 rounded-2xl p-6 text-white shadow-elevated mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold mb-2">Upcoming Events</h3>
                <p className="text-primary-100">Stay updated with important academic dates</p>
              </div>
              <Calendar className="w-6 h-6 text-white/80" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white text-primary-600 rounded-lg p-2">
                    <span className="font-bold">Dec 20</span>
                  </div>
                  <div>
                    <p className="font-semibold">Final Exams Start</p>
                    <p className="text-sm text-primary-100">6th Semester</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white text-primary-600 rounded-lg p-2">
                    <span className="font-bold">Jan 10</span>
                  </div>
                  <div>
                    <p className="font-semibold">Result Publication</p>
                    <p className="text-sm text-primary-100">Expected Date</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white text-primary-600 rounded-lg p-2">
                    <span className="font-bold">Jan 15</span>
                  </div>
                  <div>
                    <p className="font-semibold">Next Semester</p>
                    <p className="text-sm text-primary-100">Classes Begin</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Download className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Download Marksheet</h4>
                  <p className="text-sm text-neutral-600">Official mark sheet</p>
                </div>
              </div>
              <button className="w-full btn-primary text-sm py-2">
                Download PDF
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Class Ranking</h4>
                  <p className="text-sm text-neutral-600">View your position</p>
                </div>
              </div>
              <button className="w-full btn-outline text-sm py-2">
                View Ranking
              </button>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Academic Calendar</h4>
                  <p className="text-sm text-neutral-600">View important dates</p>
                </div>
              </div>
              <button className="w-full btn-secondary text-sm py-2">
                View Calendar
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
