import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, BookOpen, Calendar, Target, AlertCircle } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import PerformanceChart from '../../components/dashboard/PerformanceChart';
import api from '../../services/api';

const StudentDashboard = () => {
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudentData();
    }, []);

    const fetchStudentData = async () => {
        try {
            const response = await api.get('/results/student');
            if (response.data.success) {
                setStudentData(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch student data:', error);
        } finally {
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

    const latestResult = studentData?.[0];
    const performanceData = studentData?.map(result => ({
        semester: `Sem ${result.semester}`,
        gpa: result.gpa,
        rank: result.rank
    })) || [];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
                <p className="text-gray-600">Track your academic performance and achievements</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Current GPA"
                    value={latestResult?.gpa || 'N/A'}
                    icon={<Award className="h-6 w-6" />}
                    color="blue"
                    change={latestResult?.grade ? `Grade: ${latestResult.grade}` : 'No results yet'}
                />
                <StatCard
                    title="Rank"
                    value={latestResult?.rank ? `#${latestResult.rank}` : 'N/A'}
                    icon={<TrendingUp className="h-6 w-6" />}
                    color="green"
                    change={latestResult ? `Out of ${studentData.length} students` : ''}
                />
                <StatCard
                    title="Subjects"
                    value="6"
                    icon={<BookOpen className="h-6 w-6" />}
                    color="purple"
                    change="Current Semester"
                />
                <StatCard
                    title="Attendance"
                    value="92%"
                    icon={<Calendar className="h-6 w-6" />}
                    color="orange"
                    change="+2% from last month"
                />
            </div>

            {/* Performance Chart & Current Results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <PerformanceChart data={performanceData} />
                
                {/* Current Semester Results */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Semester Results</h3>
                    <div className="space-y-4">
                        {latestResult?.marks?.map((subject, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{subject.subject_name}</p>
                                    <p className="text-sm text-gray-600">{subject.code} • {subject.credit} Credits</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-gray-900">{subject.marks_obtained}</p>
                                    <p className="text-xs text-gray-500">/100 • {subject.grade || 'N/A'}</p>
                                </div>
                            </div>
                        ))}
                        
                        {latestResult?.statistics && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Highest</p>
                                        <p className="text-xl font-bold text-gray-900">{latestResult.statistics.highestMark}</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Average</p>
                                        <p className="text-xl font-bold text-gray-900">{latestResult.statistics.averageMarks.toFixed(1)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upcoming Exams & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upcoming Exams */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Upcoming Exams</h3>
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="space-y-4">
                        {[
                            { subject: 'Web Technology', date: 'Jan 25, 2024', time: '10:00 AM' },
                            { subject: 'Database Management', date: 'Jan 28, 2024', time: '2:00 PM' },
                            { subject: 'Software Engineering', date: 'Feb 02, 2024', time: '9:00 AM' },
                        ].map((exam, index) => (
                            <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{exam.subject}</p>
                                    <p className="text-sm text-gray-600">{exam.date} • {exam.time}</p>
                                </div>
                                <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                    Upcoming
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Academic Goals */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Academic Goals</h3>
                        <Target className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="space-y-4">
                        {[
                            { goal: 'Achieve GPA 3.8+', progress: 85, color: 'bg-green-500' },
                            { goal: 'Rank in Top 5', progress: 60, color: 'bg-blue-500' },
                            { goal: 'Complete all assignments', progress: 100, color: 'bg-purple-500' },
                            { goal: 'Improve attendance', progress: 92, color: 'bg-orange-500' },
                        ].map((goal, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">{goal.goal}</span>
                                    <span className="text-sm font-semibold text-gray-900">{goal.progress}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${goal.color} transition-all duration-500`}
                                        style={{ width: `${goal.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;