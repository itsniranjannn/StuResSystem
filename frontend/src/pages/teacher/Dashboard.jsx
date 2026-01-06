import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import PerformanceChart from '../../components/dashboard/PerformanceChart';
import api from '../../services/api';

const TeacherDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Mock data - replace with actual API call
            setTimeout(() => {
                setDashboardData({
                    students: 45,
                    subjects: 3,
                    pendingMarks: 12,
                    averagePerformance: 78.5,
                    recentMarks: [
                        { student: 'John Doe', subject: 'Web Technology', marks: 85, date: '2024-01-15' },
                        { student: 'Jane Smith', subject: 'Database', marks: 92, date: '2024-01-14' },
                        { student: 'Bob Johnson', subject: 'Software Engineering', marks: 78, date: '2024-01-13' },
                    ],
                    performanceData: [
                        { semester: 'Sem 1', gpa: 3.2 },
                        { semester: 'Sem 2', gpa: 3.4 },
                        { semester: 'Sem 3', gpa: 3.1 },
                        { semester: 'Sem 4', gpa: 3.5 },
                        { semester: 'Sem 5', gpa: 3.6 },
                        { semester: 'Sem 6', gpa: 3.8 },
                    ]
                });
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mt-12"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
                <p className="text-gray-600">Track your classes, students, and performance metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Students"
                    value={dashboardData?.students || 0}
                    icon={<Users className="h-6 w-6" />}
                    color="blue"
                    change="+5 this semester"
                />
                <StatCard
                    title="Subjects Assigned"
                    value={dashboardData?.subjects || 0}
                    icon={<BookOpen className="h-6 w-6" />}
                    color="green"
                />
                <StatCard
                    title="Pending Marks"
                    value={dashboardData?.pendingMarks || 0}
                    icon={<Clock className="h-6 w-6" />}
                    color="orange"
                    change="Urgent"
                />
                <StatCard
                    title="Avg Performance"
                    value={`${dashboardData?.averagePerformance || 0}%`}
                    icon={<TrendingUp className="h-6 w-6" />}
                    color="purple"
                    change="+2.5% from last sem"
                />
            </div>

            {/* Charts & Recent Marks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <PerformanceChart data={dashboardData?.performanceData || []} />
                
                {/* Recent Marks Entry */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Marks Entry</h3>
                    <div className="space-y-4">
                        {dashboardData?.recentMarks?.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{entry.student}</p>
                                    <p className="text-sm text-gray-600">{entry.subject}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-gray-900">{entry.marks}</p>
                                        <p className="text-xs text-gray-500">/100</p>
                                    </div>
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                        entry.marks >= 80 ? 'bg-green-100' :
                                        entry.marks >= 60 ? 'bg-blue-100' :
                                        entry.marks >= 40 ? 'bg-yellow-100' : 'bg-red-100'
                                    }`}>
                                        {entry.marks >= 80 ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center">
                        <div className="h-12 w-12 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="font-medium text-blue-700">Enter Marks</p>
                    </button>
                    <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center">
                        <div className="h-12 w-12 mx-auto mb-2 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="font-medium text-green-700">View Students</p>
                    </button>
                    <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-center">
                        <div className="h-12 w-12 mx-auto mb-2 bg-purple-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                        <p className="font-medium text-purple-700">Performance</p>
                    </button>
                    <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-center">
                        <div className="h-12 w-12 mx-auto mb-2 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                        <p className="font-medium text-orange-700">Schedule</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;