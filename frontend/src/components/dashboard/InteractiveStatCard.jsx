// frontend/src/components/dashboard/InteractiveStatCard.jsx
import React from 'react';
import { motion } from 'framer-motion';

const InteractiveStatCard = ({ title, value, icon, color, change, onClick }) => {
  const colors = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-green-500',
    purple: 'from-violet-500 to-purple-500',
    orange: 'from-amber-500 to-orange-500',
    red: 'from-rose-500 to-red-500'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <div className="p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg`}>
            {icon}
          </div>
          <div className="text-right">
            <motion.p 
              key={value}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-gray-900"
            >
              {value}
            </motion.p>
            <p className="text-sm text-gray-600">{title}</p>
          </div>
        </div>
        
        {change && (
          <div className="flex items-center text-sm">
            <span className={`px-2 py-1 rounded-full ${
              change.includes('+') 
                ? 'bg-green-100 text-green-700' 
                : change.includes('-') 
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {change}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InteractiveStatCard;