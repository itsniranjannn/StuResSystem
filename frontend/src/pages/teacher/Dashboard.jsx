import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, TrendingUp, Calendar,
  FileText, Clock, Award, BarChart3
} from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import api from '../../services/api';

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    subjectsAssigned: 0,
    marksEntered: 0,
    averageAttendance: 0
  });
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, classesRes, tasksRes] = await Promise.all([
        api.get('/teacher/dashboard'),
        api.get('/teacher/upcoming-classes'),
        api.get('/teacher/pending-tasks')
      ]);
      
      setStats(statsRes.data);
      setUpcomingClasses(classesRes.data);
      setPendingTasks(tasksRes.data);
    } catch (error) {
      console.error('Error fetching teacher dashboard:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
        <p className="text-gray-600">Manage your classes, students, and academic activities</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users className="h-8 w-8" />}
          color="blue"
          change="In your classes"
        />
        <StatCard
          title="Subjects Assigned"
          value={stats.subjectsAssigned}
          icon={<BookOpen className="h-8 w-8" />}
          color="green"
          change="This semester"
        />
        <StatCard
          title="Marks Entered"
          value={stats.marksEntered}
          icon={<FileText className="h-8 w-8" />}
          color="purple"
          change="Pending: 12"
        />
        <StatCard
          title="Avg Attendance"
          value={`${stats.averageAttendance}%`}
          icon={<TrendingUp className="h-8 w-8" />}
          color="orange"
          change="This month"
        />
      </div>

      {/* Upcoming Classes & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Classes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Upcoming Classes</h2>
            <Calendar className="h-5 w-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {upcomingClasses.map((cls, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">{cls.subject}</h3>
                  <p className="text-sm text-gray-600">{cls.time} • {cls.room}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {cls.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Pending Tasks</h2>
            <Clock className="h-5 w-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {pendingTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">{task.title}</h3>
                  <p className="text-sm text-gray-600">Due: {task.dueDate}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <Award className="h-12 w-12" />
            <div>
              <div className="text-3xl font-bold">4.8</div>
              <div className="text-sm opacity-90">Average Rating</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <BarChart3 className="h-12 w-12" />
            <div>
              <div className="text-3xl font-bold">92%</div>
              <div className="text-sm opacity-90">Student Pass Rate</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <Users className="h-12 w-12" />
            <div>
              <div className="text-3xl font-bold">15</div>
              <div className="text-sm opacity-90">Research Papers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;