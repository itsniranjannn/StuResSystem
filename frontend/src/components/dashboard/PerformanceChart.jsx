import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const PerformanceChart = () => {
  const data = [
    { semester: 'Sem 1', gpa: 2.8, average: 3.0 },
    { semester: 'Sem 2', gpa: 3.0, average: 3.1 },
    { semester: 'Sem 3', gpa: 3.2, average: 3.0 },
    { semester: 'Sem 4', gpa: 3.4, average: 3.2 },
    { semester: 'Sem 5', gpa: 3.6, average: 3.3 },
    { semester: 'Sem 6', gpa: 3.8, average: 3.5 },
  ];

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="semester" 
            stroke="#64748b"
            tick={{ fill: '#64748b' }}
          />
          <YAxis 
            stroke="#64748b"
            tick={{ fill: '#64748b' }}
            domain={[0, 4]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Area
            type="monotone"
            dataKey="gpa"
            stroke="#0066e5"
            fill="#0066e5"
            fillOpacity={0.1}
            strokeWidth={3}
          />
          <Area
            type="monotone"
            dataKey="average"
            stroke="#0ea5e9"
            fill="#0ea5e9"
            fillOpacity={0.05}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;