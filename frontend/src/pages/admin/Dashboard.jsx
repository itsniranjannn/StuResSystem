import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, Award, BarChart3, TrendingUp } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import PerformanceChart from '../../components/dashboard/PerformanceChart';
import api from '../../services/api';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentActivities, setRecentActivities] = useState([]);

    useEffect(() => {
        fetchDashboardData();
        fetchRecentActivities();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/admin/dashboard');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivities = async () => {
        try {
            const response = await api.get('/admin/logs?limit=5');
            if (response.data.success) {
                setRecentActivities(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mt-12"></div>
            </div>
        );
    }

    const chartData = stats?.distributions?.semester?.map(sem => ({
        semester: `Sem ${sem.semester}`,
        students: sem.count,
        gpa: Math.random() * 2 + 2.5 // Mock data
    })) || [];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-gray-600">Welcome back! Here's what's happening with your system.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Students"
                    value={stats?.counts?.students || 0}
                    icon={<Users className="h-6 w-6" />}
                    color="blue"
                    change="+12 this month"
                />
                <StatCard
                    title="Teachers"
                    value={stats?.counts?.teachers || 0}
                    icon={<GraduationCap className="h-6 w-6" />}
                    color="purple"
                    change="+2 this month"
                />
                <StatCard
                    title="Subjects"
                    value={stats?.counts?.subjects || 0}
                    icon={<BookOpen className="h-6 w-6" />}
                    color="green"
                    change="All active"
                />
                <StatCard
                    title="Results Published"
                    value={stats?.counts?.results || 0}
                    icon={<Award className="h-6 w-6" />}
                    color="orange"
                    change="+45 this semester"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <PerformanceChart data={chartData} type="area" />
                
                {/* Grade Distribution */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Grade Distribution</h3>
                    <div className="space-y-4">
                        {stats?.distributions?.grade?.map((grade, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                        grade.grade === 'A+' ? 'bg-green-500' :
                                        grade.grade === 'A' ? 'bg-green-400' :
                                        grade.grade === 'B+' ? 'bg-blue-500' :
                                        grade.grade === 'B' ? 'bg-blue-400' :
                                        grade.grade === 'C+' ? 'bg-yellow-500' :
                                        grade.grade === 'C' ? 'bg-yellow-400' :
                                        grade.grade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                                    }`}></div>
                                    <span className="text-sm font-medium text-gray-700">{grade.grade}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                            style={{ width: `${(grade.count / stats.counts.students) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{grade.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View All
                    </button>
                </div>
                
                <div className="space-y-4">
                    {recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                                        <TrendingUp className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                        <p className="text-xs text-gray-500">{activity.created_at}</p>
                                    </div>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                    {activity.user_role}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4">No recent activities</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;