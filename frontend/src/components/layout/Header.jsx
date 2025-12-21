import React from 'react';
import { motion } from 'framer-motion';
import { 
  Menu, Bell, Search, User, 
  ChevronDown, Calendar, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user, toggleSidebar } = useAuth();
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200"
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-neutral-700" />
            </button>
            
            <div className="hidden lg:flex items-center gap-2 text-neutral-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{formattedDate}</span>
            </div>
          </div>

          {/* Center - Search */}
          <div className="flex-1 max-w-2xl mx-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="search"
                placeholder="Search students, results, or subjects..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none text-sm placeholder:text-neutral-400"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-neutral-100 rounded-xl transition-colors relative">
              <Bell className="w-5 h-5 text-neutral-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full"></span>
            </button>
            
            <button className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
              <HelpCircle className="w-5 h-5 text-neutral-700" />
            </button>
            
            <div className="hidden lg:block border-l border-neutral-200 pl-3">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900">{user?.name}</p>
                  <p className="text-xs text-neutral-600 capitalize">{user?.role}</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;