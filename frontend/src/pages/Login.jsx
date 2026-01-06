import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const { login, error } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        const result = await login(email, password);
        setIsLoading(false);
        
        if (!result.success) {
            // Error is already set in context
            return;
        }
    };

    const demoCredentials = [
        { role: 'Admin', email: 'admin@example.com', password: 'admin123' },
        { role: 'Teacher', email: 'teacher@example.com', password: 'teacher123' },
        { role: 'Student', email: 'student@example.com', password: 'student123' }
    ];

    const handleDemoLogin = (email, password) => {
        setEmail(email);
        setPassword(password);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left side - Brand & Info */}
                <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-8 lg:p-12 text-white hidden lg:block">
                    <div className="h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center space-x-3 mb-8">
                                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Award className="h-6 w-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">Student Result System</h1>
                                    <p className="text-blue-100">TU BCA 6th Semester</p>
                                </div>
                            </div>
                            
                            <h2 className="text-3xl font-bold mb-4">
                                Welcome Back to<br />
                                Academic Excellence
                            </h2>
                            <p className="text-blue-100 mb-8">
                                Track your academic performance, view rankings, and analyze results with our comprehensive student management system.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">📊</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Advanced Analytics</h3>
                                    <p className="text-sm text-blue-100">Detailed performance insights</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">🏆</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Ranking System</h3>
                                    <p className="text-sm text-blue-100">TU-based grading & ranking</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">🔒</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Secure Access</h3>
                                    <p className="text-sm text-blue-100">Role-based authentication</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Login Form */}
                <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-xl">
                    <div className="max-w-md mx-auto">
                        {/* Mobile logo */}
                        <div className="flex items-center space-x-3 mb-8 lg:hidden">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center">
                                <Award className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Student Result System</h1>
                                <p className="text-gray-600">TU BCA 6th Semester</p>
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
                        <p className="text-gray-600 mb-8">
                            Enter your credentials to access your dashboard
                        </p>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
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
                                        className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="you@example.com"
                                        required
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
                                        className="pl-10 pr-12 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Remember me</span>
                                </label>
                                <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    Forgot password?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </button>

                            <div className="text-center">
                                <p className="text-gray-600 text-sm">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                                        Sign up now
                                    </Link>
                                </p>
                            </div>
                        </form>

                        {/* Demo Credentials */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-4 text-center">Try demo accounts:</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {demoCredentials.map((cred, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleDemoLogin(cred.email, cred.password)}
                                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                                    >
                                        <div className="font-medium text-gray-900">{cred.role}</div>
                                        <div className="text-gray-600 text-xs mt-1">{cred.email}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;