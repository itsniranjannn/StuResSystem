import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  BookOpen,
  Award,
  TrendingUp,
  BarChart3,
  Edit,
  Download,
  Printer
} from 'lucide-react';
import api from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStudentDetails();
  }, [id]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/students/${id}`);
      setStudent(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch student details');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateGrade = (marks) => {
    if (marks >= 90) return { grade: 'A+', color: 'bg-green-100 text-green-800' };
    if (marks >= 80) return { grade: 'A', color: 'bg-green-100 text-green-800' };
    if (marks >= 70) return { grade: 'B+', color: 'bg-blue-100 text-blue-800' };
    if (marks >= 60) return { grade: 'B', color: 'bg-blue-100 text-blue-800' };
    if (marks >= 50) return { grade: 'C+', color: 'bg-yellow-100 text-yellow-800' };
    if (marks >= 40) return { grade: 'C', color: 'bg-yellow-100 text-yellow-800' };
    if (marks >= 30) return { grade: 'D+', color: 'bg-orange-100 text-orange-800' };
    if (marks >= 20) return { grade: 'D', color: 'bg-orange-100 text-orange-800' };
    return { grade: 'F', color: 'bg-red-100 text-red-800' };
  };

  const generatePerformanceChartData = () => {
    if (!student?.marks) return [];
    
    return student.marks.map(mark => ({
      subject: mark.subject_code,
      marks: parseFloat(mark.marks_obtained),
      fullMarks: mark.full_marks
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Student not found</h3>
        <button
          onClick={() => navigate('/students')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to Students
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/students')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.student_name}</h1>
            <p className="text-gray-600">{student.roll_no} • {student.program} Semester {student.semester}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/students/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit size={20} />
            Edit Profile
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={20} />
            Download
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer size={20} />
            Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'marks', 'results', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'overview' ? 'Overview' :
               tab === 'marks' ? 'Marks' :
               tab === 'results' ? 'Results' : 'History'}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col items-center">
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4">
                  {student.profile_image ? (
                    <img
                      src={student.profile_image}
                      alt={student.student_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center text-white text-4xl font-bold">
                      {student.student_name.charAt(0)}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{student.student_name}</h2>
                <p className="text-gray-600">{student.email}</p>
                {student.gpa && (
                  <div className="mt-4 px-4 py-2 bg-gradient-to-r from-green-500 to-green-400 text-white rounded-full">
                    GPA: {student.gpa} • {student.grade}
                  </div>
                )}
              </div>

              {/* Info Grid */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Program</p>
                    <p className="font-medium">{student.program}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Semester</p>
                    <p className="font-medium">Semester {student.semester}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Faculty</p>
                    <p className="font-medium">{student.faculty}</p>
                  </div>
                </div>
                {student.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{student.phone}</p>
                    </div>
                  </div>
                )}
                {student.dob && (
                  <div className="flex items-center gap-3">
                    <Calendar className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{formatDate(student.dob)}</p>
                    </div>
                  </div>
                )}
                {student.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{student.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Family Info */}
            {(student.father_name || student.mother_name) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Information</h3>
                <div className="space-y-4">
                  {student.father_name && (
                    <div>
                      <p className="text-sm text-gray-500">Father's Name</p>
                      <p className="font-medium">{student.father_name}</p>
                    </div>
                  )}
                  {student.mother_name && (
                    <div>
                      <p className="text-sm text-gray-500">Mother's Name</p>
                      <p className="font-medium">{student.mother_name}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stats & Performance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Total Subjects</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {student.statistics?.totalSubjects || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <BookOpen className="text-blue-600" size={24} />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Average Marks</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {student.statistics?.averageMarks || '0.00'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <BarChart3 className="text-green-600" size={24} />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Highest Marks</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {student.statistics?.highestMark || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <TrendingUp className="text-purple-600" size={24} />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Current Rank</p>
                    <p className="text-3xl font-bold text-gray-900">
                      #{student.rank || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Award className="text-orange-600" size={24} />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Chart</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generatePerformanceChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="marks"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Marks */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Marks</h3>
              {student.marks && student.marks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marks
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {student.marks.slice(0, 5).map((mark) => {
                        const gradeInfo = calculateGrade(mark.marks_obtained);
                        return (
                          <tr key={mark.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {mark.subject_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {mark.subject_code}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {mark.marks_obtained} / {mark.full_marks}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(mark.marks_obtained / mark.full_marks) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${gradeInfo.color}`}>
                                {gradeInfo.grade}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                mark.marks_obtained >= 40 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {mark.marks_obtained >= 40 ? 'Passed' : 'Failed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">No marks recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'marks' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">All Marks</h2>
            <div className="flex gap-2">
              <select className="px-3 py-2 border border-gray-300 rounded-lg">
                <option>All Subjects</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg">
                <option>All Exams</option>
              </select>
            </div>
          </div>
          
          {student.marks && student.marks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks Obtained
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam Year
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {student.marks.map((mark) => {
                    const percentage = ((mark.marks_obtained / mark.full_marks) * 100).toFixed(2);
                    const gradeInfo = calculateGrade(mark.marks_obtained);
                    
                    return (
                      <tr key={mark.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{mark.subject_name}</div>
                          <div className="text-sm text-gray-500">Credit: {mark.credit || 3}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {mark.subject_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            mark.exam_type === 'final' 
                              ? 'bg-purple-100 text-purple-800'
                              : mark.exam_type === 'internal'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {mark.exam_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {mark.marks_obtained} / {mark.full_marks}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {percentage}%
                          </div>
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                parseFloat(percentage) >= 80 ? 'bg-green-600' :
                                parseFloat(percentage) >= 60 ? 'bg-blue-600' :
                                parseFloat(percentage) >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${gradeInfo.color}`}>
                            {gradeInfo.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {mark.exam_year}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No marks recorded</h3>
              <p className="mt-1 text-sm text-gray-500">Marks will appear here once entered by teachers</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Exam Results</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Generate Report
            </button>
          </div>
          
          {student.results && student.results.length > 0 ? (
            <div className="space-y-6">
              {student.results.map((result) => (
                <div key={result.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Semester {result.semester} Result - {result.exam_year}
                      </h3>
                      <p className="text-gray-600">Published: {formatDate(result.published_at || result.updated_at)}</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{result.gpa}</div>
                        <div className="text-sm text-gray-600">GPA</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{result.grade}</div>
                        <div className="text-sm text-gray-600">Grade</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">#{result.rank}</div>
                        <div className="text-sm text-gray-600">Rank</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Total Marks</div>
                      <div className="text-xl font-bold text-gray-900">{result.total_marks}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Total Credits</div>
                      <div className="text-xl font-bold text-gray-900">{result.total_credits}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Result Status</div>
                      <div className={`text-xl font-bold ${result.published ? 'text-green-600' : 'text-yellow-600'}`}>
                        {result.published ? 'Published' : 'Draft'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Class Size</div>
                      <div className="text-xl font-bold text-gray-900">--</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results available</h3>
              <p className="mt-1 text-sm text-gray-500">Results will appear here once published by admin</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDetail;