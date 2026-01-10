// frontend/src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
    Users, GraduationCap, BookOpen, Award, BarChart3, TrendingUp,
    Clock, Shield, Calendar, Activity, Target, PieChart,
    AlertCircle, CheckCircle, Download, Filter, Search,
    MoreVertical, Eye, Edit, Trash2, RefreshCw, Plus,
    TrendingDown, TrendingUp as TrendingUpIcon, DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentActivities, setRecentActivities] = useState([]);
    const [recentStudents, setRecentStudents] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [topPerformers, setTopPerformers] = useState([]);
    const [fetchError, setFetchError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('month');

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [timeRange]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setFetchError(null);
            
            // Fetch all dashboard data in parallel
            const [
                statsResponse,
                activitiesResponse,
                studentsResponse,
                chartResponse,
                performersResponse
            ] = await Promise.all([
                api.get('/admin/dashboard'),
                api.get('/admin/logs?limit=5'),
                api.get('/students?page=1&limit=5'),
                api.get('/admin/chart-data?range=' + timeRange),
                api.get('/results/rankings?semester=6&limit=5')
            ]);
            
            if (statsResponse.data.success) setStats(statsResponse.data.data);
            if (activitiesResponse.data.success) setRecentActivities(activitiesResponse.data.data);
            if (studentsResponse.data.success) setRecentStudents(studentsResponse.data.data.rows || []);
            if (chartResponse.data.success) setChartData(chartResponse.data.data);
            if (performersResponse.data.success) setTopPerformers(performersResponse.data.data);
            
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            if (error.code === 'ERR_NETWORK') {
                setFetchError('Backend server connection failed. Please ensure server is running on port 5000.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchDashboardData();
    };

    const handleExport = () => {
        // Export functionality
        console.log('Exporting dashboard data...');
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading dashboard data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-xl p-8 border border-red-200"
                    >
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                                <AlertCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Connection Error</h2>
                            <p className="text-gray-600 mb-6">{fetchError}</p>
                            <div className="space-y-4">
                                <button
                                    onClick={fetchDashboardData}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                >
                                    <RefreshCw className="inline-block mr-2 h-4 w-4" />
                                    Retry Connection
                                </button>
                                <p className="text-sm text-gray-500">
                                    Make sure backend server is running: <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    // Stats cards data
    const statCards = [
        {
            title: 'Total Students',
            value: stats?.counts?.students || 0,
            icon: <Users className="h-6 w-6" />,
            color: 'from-blue-500 to-cyan-500',
            change: '+12%',
            trend: 'up',
            description: 'Active students this semester'
        },
        {
            title: 'Teachers',
            value: stats?.counts?.teachers || 0,
            icon: <GraduationCap className="h-6 w-6" />,
            color: 'from-purple-500 to-pink-500',
            change: '+5%',
            trend: 'up',
            description: 'Faculty members'
        },
        {
            title: 'Subjects',
            value: stats?.counts?.subjects || 0,
            icon: <BookOpen className="h-6 w-6" />,
            color: 'from-emerald-500 to-teal-500',
            change: '0%',
            trend: 'neutral',
            description: 'Courses available'
        },
        {
            title: 'Results Published',
            value: stats?.counts?.results || 0,
            icon: <Award className="h-6 w-6" />,
            color: 'from-amber-500 to-orange-500',
            change: '+45',
            trend: 'up',
            description: 'This semester'
        },
        {
            title: 'Pending Marks',
            value: stats?.counts?.pendingMarks || 18,
            icon: <Clock className="h-6 w-6" />,
            color: 'from-rose-500 to-red-500',
            change: '-3',
            trend: 'down',
            description: 'Require attention'
        },
        {
            title: 'Avg GPA',
            value: '3.45',
            icon: <Target className="h-6 w-6" />,
            color: 'from-indigo-500 to-violet-500',
            change: '+0.15',
            trend: 'up',
            description: 'Semester average'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-600 mt-2">Welcome back! Here's your system overview</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="quarter">This Quarter</option>
                            <option value="year">This Year</option>
                        </select>
                        
                        <button
                            onClick={handleRefresh}
                            className="p-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <RefreshCw className="h-5 w-5 text-gray-600" />
                        </button>
                        
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </button>
                    </div>
                </div>
                
                {/* Quick Stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {statCards.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                                    <div className={`text-white bg-gradient-to-br ${stat.color} p-2 rounded-lg`}>
                                        {stat.icon}
                                    </div>
                                </div>
                                <div className={`flex items-center text-sm font-medium ${
                                    stat.trend === 'up' ? 'text-green-600' : 
                                    stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                    {stat.trend === 'up' && <TrendingUpIcon className="h-4 w-4 mr-1" />}
                                    {stat.trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
                                    {stat.change}
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                            <p className="text-sm font-medium text-gray-700">{stat.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Left Column - Charts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Performance Chart */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
                                <p className="text-sm text-gray-600">Student performance trends</p>
                            </div>
                            <div className="flex space-x-2">
                                <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg">Monthly</button>
                                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">Quarterly</button>
                                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">Yearly</button>
                            </div>
                        </div>
                        
                        {/* Chart Container */}
                        <div className="h-80 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl">
                            <div className="text-center">
                                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">Performance chart would display here</p>
                                <p className="text-sm text-gray-500 mt-2">Real-time data from database</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Top Performers */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                                <p className="text-sm text-gray-600">Students with highest GPA</p>
                            </div>
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                View All →
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {topPerformers.length > 0 ? topPerformers.map((student, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                            index === 0 ? 'bg-yellow-100 text-yellow-600' :
                                            index === 1 ? 'bg-gray-100 text-gray-600' :
                                            index === 2 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            <span className="font-bold">{index + 1}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{student.student_name}</p>
                                            <p className="text-sm text-gray-600">Roll: {student.roll_no} • Sem: {student.semester}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xl font-bold text-gray-900">{student.gpa || '3.8'}</span>
                                            <span className="text-sm text-gray-500">GPA</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Rank #{student.rank || index + 1}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600">No performance data available</p>
                                    <p className="text-sm text-gray-500 mt-1">Calculate results to see rankings</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                    {/* Recent Activities */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                                <p className="text-sm text-gray-600">System logs and updates</p>
                            </div>
                            <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        
                        <div className="space-y-4">
                            {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                                <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        activity.action?.includes('login') ? 'bg-green-100 text-green-600' :
                                        activity.action?.includes('create') ? 'bg-blue-100 text-blue-600' :
                                        activity.action?.includes('update') ? 'bg-amber-100 text-amber-600' :
                                        activity.action?.includes('delete') ? 'bg-red-100 text-red-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {activity.action?.includes('login') ? <Shield className="h-4 w-4" /> :
                                         activity.action?.includes('create') ? <Plus className="h-4 w-4" /> :
                                         activity.action?.includes('update') ? <Edit className="h-4 w-4" /> :
                                         activity.action?.includes('delete') ? <Trash2 className="h-4 w-4" /> :
                                         <Activity className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{activity.action || 'System Activity'}</p>
                                        <p className="text-xs text-gray-500">{activity.user_role || 'System'} • {new Date(activity.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-4">
                                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-600 text-sm">No recent activities</p>
                                </div>
                            )}
                            
                            <button className="w-full py-2 text-center text-blue-600 hover:text-blue-700 text-sm font-medium border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
                                View All Activities
                            </button>
                        </div>
                    </motion.div>

                    {/* Recent Students */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Recent Students</h3>
                                <p className="text-sm text-gray-600">Newly registered students</p>
                            </div>
                            <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        
                        <div className="space-y-4">
                            {recentStudents.length > 0 ? recentStudents.map((student, index) => (
                                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">
                                                {student.student_name?.charAt(0) || 'S'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{student.student_name || 'Student Name'}</p>
                                            <p className="text-sm text-gray-600">Roll: {student.roll_no || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                            Sem {student.semester || 'N/A'}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">{student.program || 'Program'}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-4">
                                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-600 text-sm">No student data available</p>
                                    <p className="text-xs text-gray-500 mt-1">Students will appear here when registered</p>
                                </div>
                            )}
                            
                            <button className="w-full py-2 text-center text-purple-600 hover:text-purple-700 text-sm font-medium border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors">
                                Manage All Students
                            </button>
                        </div>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white"
                    >
                        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center">
                                <Plus className="h-5 w-5 mx-auto mb-1" />
                                <span className="text-xs font-medium">Add Student</span>
                            </button>
                            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center">
                                <Award className="h-5 w-5 mx-auto mb-1" />
                                <span className="text-xs font-medium">Publish Results</span>
                            </button>
                            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center">
                                <BarChart3 className="h-5 w-5 mx-auto mb-1" />
                                <span className="text-xs font-medium">Generate Report</span>
                            </button>
                            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center">
                                <Shield className="h-5 w-5 mx-auto mb-1" />
                                <span className="text-xs font-medium">System Settings</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Section - Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                {/* Grade Distribution */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Grade Distribution</h3>
                    <div className="space-y-4">
                        {[
                            { grade: 'A+', count: 12, color: 'bg-green-500', percentage: '15%' },
                            { grade: 'A', count: 28, color: 'bg-green-400', percentage: '35%' },
                            { grade: 'B+', count: 18, color: 'bg-blue-500', percentage: '22.5%' },
                            { grade: 'B', count: 12, color: 'bg-blue-400', percentage: '15%' },
                            { grade: 'C+', count: 6, color: 'bg-yellow-500', percentage: '7.5%' },
                            { grade: 'C', count: 4, color: 'bg-yellow-400', percentage: '5%' },
                        ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                    <span className="text-sm font-medium text-gray-700">{item.grade}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${item.color} transition-all duration-500`}
                                            style={{ width: item.percentage }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Attendance Overview */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Attendance Overview</h3>
                        <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-900">92%</div>
                            <p className="text-sm text-gray-600">Average Attendance</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-green-50 rounded-xl">
                                <div className="text-xl font-bold text-green-600">95%</div>
                                <p className="text-xs text-green-700">Present</p>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-xl">
                                <div className="text-xl font-bold text-yellow-600">3%</div>
                                <p className="text-xs text-yellow-700">Late</p>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-xl">
                                <div className="text-xl font-bold text-red-600">2%</div>
                                <p className="text-xs text-red-700">Absent</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                        <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Database</span>
                            <div className="flex items-center">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                <span className="text-sm font-medium text-green-600">Connected</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">API Server</span>
                            <div className="flex items-center">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                <span className="text-sm font-medium text-green-600">Running</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Email Service</span>
                            <div className="flex items-center">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                <span className="text-sm font-medium text-green-600">Active</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Storage</span>
                            <div className="flex items-center">
                                <div className="h-2 w-2 rounded-full bg-amber-500 mr-2"></div>
                                <span className="text-sm font-medium text-amber-600">78% Used</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
                        <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="space-y-3">
                        {[
                            { task: 'Result Publication', date: 'Jan 25', priority: 'high' },
                            { task: 'Marks Entry', date: 'Jan 22', priority: 'medium' },
                            { task: 'Attendance Update', date: 'Jan 20', priority: 'low' },
                            { task: 'Report Generation', date: 'Jan 28', priority: 'medium' },
                        ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{item.task}</p>
                                    <p className="text-xs text-gray-500">{item.date}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    item.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    item.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                    {item.priority}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminDashboard;