import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatCard = ({ title, value, icon, change, color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500'
    };

    const getChangeIcon = () => {
        if (!change) return null;
        if (change.startsWith('+')) return <TrendingUp className="h-4 w-4 text-green-500" />;
        if (change.startsWith('-')) return <TrendingDown className="h-4 w-4 text-red-500" />;
        return <Minus className="h-4 w-4 text-gray-500" />;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                    {change && (
                        <div className="flex items-center mt-2 space-x-1">
                            {getChangeIcon()}
                            <span className={`text-sm ${change.startsWith('+') ? 'text-green-600' : change.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                                {change}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-10`}>
                    <div className={`text-${color}-600`}>
                        {icon}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatCard;