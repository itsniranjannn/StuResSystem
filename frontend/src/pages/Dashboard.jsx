import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, BookOpen, Trophy, TrendingUp,
  Calendar, Users, BarChart3, Settings,
  LogOut, Bell, Search, Menu, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const stats = [
    { icon: BookOpen, label: 'Total Subjects', value: '5', color: 'bg-blue-500' },
    { icon: Users, label: 'Total Students', value: '45', color: 'bg-green-500' },
    { icon: TrendingUp, label: 'Average GPA', value: '3.2', color: 'bg-purple-500' },
    { icon: Trophy, label: 'Your Rank', value: user.role === 'student' ? '12th' : 'N/A', color: 'bg-yellow-500' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-sm p-4 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="w-10"></div>
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:w-64`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-primary-500 to-blue-600 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Result System</h2>
                <p className="text-xs text-gray-600">TU BCA 6th Sem</p>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{user?.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                {user?.roll_no && (
                  <p className="text-xs text-gray-500">{user.roll_no}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {[
              { icon: BarChart3, label: 'Dashboard', active: true },
              { icon: BookOpen, label: 'Results', active: false },
              { icon: Calendar, label: 'Schedule', active: false },
              { icon: Users, label: 'Students', active: false },
              { icon: Trophy, label: 'Ranking', active: false },
              { icon: Settings, label: 'Settings', active: false },
            ].map((item, index) => (
              <motion.button
                key={index}
                whileHover={{ x: 4 }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  item.active
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Topbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search students, results, or subjects..."
                  className="w-full pl-12 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-xl focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="hidden lg:block">
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 lg:p-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your academic performance today.
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 ${stat.color} rounded-xl`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
          >
            {/* Recent Results */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Results</h2>
                <button className="text-primary-600 hover:text-primary-700 font-medium">
                  View All →
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { subject: 'Web Technology', marks: 85, grade: 'A' },
                  { subject: 'Database Management', marks: 78, grade: 'B+' },
                  { subject: 'Software Engineering', marks: 92, grade: 'A+' },
                ].map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{result.subject}</p>
                      <p className="text-sm text-gray-600">6th Semester</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{result.marks}%</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.grade === 'A+' ? 'bg-green-100 text-green-800' :
                        result.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Class Ranking */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Class Ranking</h2>
                <button className="text-primary-600 hover:text-primary-700 font-medium">
                  Full Ranking →
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { rank: 1, name: 'Jane Smith', gpa: 3.8 },
                  { rank: 2, name: 'John Doe', gpa: 3.6 },
                  { rank: 3, name: 'Robert Brown', gpa: 3.5 },
                  { rank: 4, name: 'You', gpa: 3.2, highlight: true },
                ].map((student, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      student.highlight
                        ? 'bg-primary-50 border border-primary-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        student.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                        student.rank === 2 ? 'bg-gray-100 text-gray-800' :
                        student.rank === 3 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        <span className="font-bold">#{student.rank}</span>
                      </div>
                      <div>
                        <p className={`font-medium ${
                          student.highlight ? 'text-primary-700' : 'text-gray-900'
                        }`}>
                          {student.name}
                          {student.highlight && ' (You)'}
                        </p>
                        <p className="text-sm text-gray-600">BCA 6th Semester</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{student.gpa}</p>
                      <p className="text-sm text-gray-600">GPA</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-r from-primary-500 to-blue-600 rounded-2xl shadow-xl p-8 text-white"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Upcoming Events</h2>
                <p className="text-primary-100">Stay updated with important academic dates</p>
              </div>
              <Calendar className="w-8 h-8 text-white opacity-80" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { date: 'Dec 20', title: 'Final Exam Starts', desc: '6th Semester' },
                { date: 'Dec 25', title: 'Christmas Break', desc: 'College Holiday' },
                { date: 'Jan 10', title: 'Result Publication', desc: 'Expected Date' },
              ].map((event, index) => (
                <div
                  key={index}
                  className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white text-primary-600 rounded-lg p-3 text-center min-w-16">
                      <p className="text-lg font-bold">{event.date}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-primary-100">{event.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;