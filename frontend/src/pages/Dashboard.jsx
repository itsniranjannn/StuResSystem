import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  Award, 
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  Eye
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import RecentResults from '../components/dashboard/RecentResults';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import QuickActions from '../components/dashboard/QuickActions';

const Dashboard = () => {
  const stats = [
    { 
      title: 'Total Students', 
      value: '248', 
      change: '+12%', 
      icon: Users,
      color: 'primary',
      trend: 'up'
    },
    { 
      title: 'Subjects', 
      value: '32', 
      change: '+2', 
      icon: BookOpen,
      color: 'secondary',
      trend: 'up'
    },
    { 
      title: 'Results Published', 
      value: '186', 
      change: '+24', 
      icon: Award,
      color: 'accent-success',
      trend: 'up'
    },
    { 
      title: 'Average GPA', 
      value: '3.42', 
      change: '+0.12', 
      icon: TrendingUp,
      color: 'accent-warning',
      trend: 'up'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">Dashboard</h1>
          <p className="text-neutral-600 mt-1">Welcome back! Here's your academic overview.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors">
            <Calendar className="w-5 h-5" />
            <span>Select Date</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
            <Download className="w-5 h-5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Charts and Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="card p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-800">Performance Overview</h3>
                <p className="text-sm text-neutral-600">Semester-wise GPA trends</p>
              </div>
              <button className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                <Eye className="w-4 h-4" />
                <span className="text-sm">View Details</span>
              </button>
            </div>
            <PerformanceChart />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <QuickActions />
        </motion.div>
      </div>

      {/* Recent Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <RecentResults />
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;