import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, change, icon: Icon, color, trend }) => {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    'accent-success': 'bg-green-50 text-green-600',
    'accent-warning': 'bg-yellow-50 text-yellow-600',
    'accent-danger': 'bg-red-50 text-red-600',
    'accent-info': 'bg-blue-50 text-blue-600',
  };

  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="card p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-600 mb-2">{title}</p>
          <h3 className="text-2xl font-bold text-neutral-800">{value}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full ${trendColors[trend] || trendColors.neutral}`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {change}
            </span>
            <span className="text-xs text-neutral-500">from last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;