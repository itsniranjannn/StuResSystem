// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Shield, Mail, Lock, Eye, EyeOff, 
    Award, Users, GraduationCap, Building,
    AlertCircle, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [backendStatus, setBackendStatus] = useState('checking');
    
    const { login, error, clearError } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        
        // Basic validation
        if (!email.trim() || !password.trim()) {
            return;
        }
        
        setIsLoading(true);
        
        const result = await login(email, password);
        
        if (!result.success) {
            setIsLoading(false);
        }
        // On success, AuthContext handles navigation
    };

    const demoCredentials = [
        { role: 'Admin', email: 'niranjanadmin@gmail.com', password: 'Niranjan.k@1' },
        { role: 'Teacher', email: 'teacher@example.com', password: 'Teacher@123' },
        { role: 'Student', email: 'student@example.com', password: 'Student@123' }
    ];

    const handleDemoLogin = (email, password) => {
        setEmail(email);
        setPassword(password);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left side - Brand & Info */}
                <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-2xl p-8 lg:p-12 text-white hidden lg:block"
                >
                    <div className="h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center space-x-3 mb-8">
                                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">Academic Results Portal</h1>
                                    <p className="text-blue-100">Professional Management System</p>
                                </div>
                            </div>
                            
                            <h2 className="text-3xl font-bold mb-4">
                                Welcome Back<br />
                                To Excellence
                            </h2>
                            <p className="text-blue-100/90 mb-8">
                                Access comprehensive academic results, performance analytics, and student management tools.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <Award className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Results Management</h3>
                                    <p className="text-sm text-blue-100/80">Comprehensive grading system</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Student Analytics</h3>
                                    <p className="text-sm text-blue-100/80">Performance insights & reports</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <Building className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Multi-role Access</h3>
                                    <p className="text-sm text-blue-100/80">Admin, Teacher & Student portals</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right side - Login Form */}
                <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white rounded-2xl p-8 lg:p-12 shadow-2xl border border-gray-100"
                >
                    <div className="max-w-md mx-auto">
                        {/* Mobile logo */}
                        <div className="flex items-center space-x-3 mb-8 lg:hidden">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-gray-900 to-blue-900 flex items-center justify-center">
                                <Shield className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Academic Portal</h1>
                                <p className="text-gray-600">Professional Management System</p>
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                        <p className="text-gray-600 mb-8">
                            Enter your credentials to access your dashboard
                        </p>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3"
                            >
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-red-700 text-sm">{error}</p>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                                        placeholder="your.email@domain.com"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-12 py-3 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                                        placeholder="••••••••"
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        disabled={isLoading}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        disabled={isLoading}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Remember me</span>
                                </label>
                                <Link 
                                    to="/forgot-password" 
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                className="w-full bg-gradient-to-r from-gray-900 to-blue-900 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </motion.button>

                            <div className="text-center">
                                <p className="text-gray-600 text-sm">
                                    Don't have an account?{' '}
                                    <Link 
                                        to="/register" 
                                        className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                    >
                                        Create account
                                    </Link>
                                </p>
                            </div>
                        </form>

                        {/* Demo Credentials */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-4 text-center">Try demo accounts:</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {demoCredentials.map((cred, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => handleDemoLogin(cred.email, cred.password)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors border border-gray-200"
                                    >
                                        <div className="font-medium text-gray-900">{cred.role}</div>
                                        <div className="text-gray-600 text-xs mt-1 truncate">{cred.email}</div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;