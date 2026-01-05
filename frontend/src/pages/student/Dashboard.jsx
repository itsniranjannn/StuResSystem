import React, { useState, useEffect } from 'react';
import { 
  Award, TrendingUp, Calendar, BookOpen,
  FileText, Clock, Trophy, Bell
} from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import api from '../../services/api';

const StudentDashboard = () => {
  const [stats, setStats] = useState({
    currentGPA: 0,
    attendance: 0,
    rank: 0,
    completedSubjects: 0
  });
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, examsRes, resultsRes] = await Promise.all([
        api.get('/student/dashboard'),
        api.get('/student/upcoming-exams'),
        api.get('/student/recent-results')
      ]);
      
      setStats(statsRes.data);
      setUpcomingExams(examsRes.data);
      setRecentResults(resultsRes.data);
    } catch (error) {
      console.error('Error fetching student dashboard:', error);
    }
  };

  const getGradeColor = (grade) => {
    switch(grade) {
      case 'A+': return 'text-green-600 bg-green-50';
      case 'A': return 'text-green-500 bg-green-50';
      case 'B+': return 'text-blue-500 bg-blue-50';
      case 'B': return 'text-blue-400 bg-blue-50';
      case 'C+': return 'text-yellow-500 bg-yellow-50';
      case 'C': return 'text-yellow-400 bg-yellow-50';
      default: return 'text-red-500 bg-red-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
          <p className="text-gray-600">Welcome back! Track your academic progress and activities</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Current GPA"
          value={stats.currentGPA.toFixed(2)}
          icon={<Award className="h-8 w-8" />}
          color="green"
          change="+0.2 from last sem"
        />
        <StatCard
          title="Attendance"
          value={`${stats.attendance}%`}
          icon={<TrendingUp className="h-8 w-8" />}
          color="blue"
          change="Good attendance"
        />
        <StatCard
          title="Class Rank"
          value={`#${stats.rank}`}
          icon={<Trophy className="h-8 w-8" />}
          color="orange"
          change={`Out of ${stats.totalStudents || 50}`}
        />
        <StatCard
          title="Subjects Completed"
          value={stats.completedSubjects}
          icon={<BookOpen className="h-8 w-8" />}
          color="purple"
          change={`Total: ${stats.totalSubjects || 6}`}
        />
      </div>

      {/* Upcoming Exams & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Upcoming Exams</h2>
            <Calendar className="h-5 w-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {upcomingExams.map((exam, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">{exam.subject}</h3>
                  <p className="text-sm text-gray-600">{exam.date} • {exam.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{exam.remaining}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Results</h2>
            <FileText className="h-5 w-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {recentResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">{result.subject}</h3>
                  <p className="text-sm text-gray-600">Sem {result.semester} • {result.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800">{result.marks}%</span>
                  <span className={`px-2 py-1 rounded text-sm ${getGradeColor(result.grade)}`}>
                    {result.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-green-600">85%</div>
            <div className="text-sm text-gray-600">Avg Marks</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-blue-600">92%</div>
            <div className="text-sm text-gray-600">Assignment Score</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-purple-600">88%</div>
            <div className="text-sm text-gray-600">Lab Work</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-orange-600">15/20</div>
            <div className="text-sm text-gray-600">Attendance Days</div>
          </div>
        </div>
      </div>

      {/* Academic Calendar */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Important Dates</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Mid-Term Exams</h3>
                <p className="text-sm text-gray-600">All subjects</p>
              </div>
            </div>
            <span className="text-sm text-gray-600">Dec 15-20, 2024</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Project Submission</h3>
                <p className="text-sm text-gray-600">Software Engineering</p>
              </div>
            </div>
            <span className="text-sm text-gray-600">Dec 25, 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;