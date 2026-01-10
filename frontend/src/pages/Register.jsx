// frontend/src/pages/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Shield, Mail, Lock, User, Phone, BookOpen,
    GraduationCap, Calendar, MapPin, Eye, EyeOff,
    AlertCircle, Users, Building, CheckCircle,
    XCircle, ArrowRight, School
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const Register = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
        roll_no: '',
        student_name: '',
        semester: 1,
        program: 'BCA',
        phone: '',
        address: '',
        dob: '',
        teacher_name: '',
        department: 'Computer Science',
        qualification: '',
        experience: '',
        specialization: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [backendStatus, setBackendStatus] = useState('checking');

    const { register, error: authError, clearError } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        checkBackendConnection();
        clearError();
    }, []);

    const checkBackendConnection = async () => {
        try {
            const response = await api.get('/health');
            if (response.data.status === 'healthy') {
                setBackendStatus('connected');
            } else {
                setBackendStatus('error');
            }
        } catch (error) {
            console.error('Backend connection failed:', error);
            setBackendStatus('error');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Format roll number (numeric only)
        if (name === 'roll_no') {
            const numericValue = value.replace(/\D/g, '');
            setFormData(prev => ({ ...prev, [name]: numericValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateStep1 = () => {
        const newErrors = {};
        
        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Full name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        
        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(formData.password)) {
                newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, number and special character';
            }
        }
        
        // Confirm password
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};
        
        if (formData.role === 'student') {
            // Student validation
            if (!formData.roll_no.trim()) {
                newErrors.roll_no = 'Roll number is required';
            } else if (formData.roll_no.length < 3) {
                newErrors.roll_no = 'Roll number must be at least 3 digits';
            }
            
            if (!formData.student_name.trim()) {
                newErrors.student_name = 'Student name is required';
            } else if (formData.student_name.trim().length < 2) {
                newErrors.student_name = 'Enter full name';
            }
            
            if (!formData.semester) {
                newErrors.semester = 'Please select semester';
            }
            
            if (formData.phone && !/^[\d\s\+\-\(\)]{10,15}$/.test(formData.phone)) {
                newErrors.phone = 'Invalid phone number format';
            }
            
            if (formData.dob) {
                const dobDate = new Date(formData.dob);
                const today = new Date();
                const minAge = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
                if (dobDate > minAge) {
                    newErrors.dob = 'Must be at least 16 years old';
                }
            }
            
        } else if (formData.role === 'teacher') {
            // Teacher validation
            if (!formData.teacher_name.trim()) {
                newErrors.teacher_name = 'Teacher name is required';
            } else if (formData.teacher_name.trim().length < 2) {
                newErrors.teacher_name = 'Enter full name';
            }
            
            if (!formData.department) {
                newErrors.department = 'Department is required';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleBack = () => {
        setStep(1);
        setErrors({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (backendStatus !== 'connected') {
            setErrors({ submit: 'Backend server is not running. Please start the server first.' });
            return;
        }
        
        if (!validateStep2()) {
            return;
        }
        
        setLoading(true);
        setErrors({});
        setSuccessMessage('');
        clearError();
        
        try {
            // Prepare registration data based on role
            const registrationData = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                role: formData.role,
                ...(formData.role === 'student' && {
                    roll_no: formData.roll_no.trim(),
                    student_name: formData.student_name.trim(),
                    semester: parseInt(formData.semester),
                    program: formData.program,
                    phone: formData.phone?.trim() || '',
                    address: formData.address?.trim() || '',
                    dob: formData.dob || null
                }),
                ...(formData.role === 'teacher' && {
                    teacher_name: formData.teacher_name.trim(),
                    department: formData.department,
                    qualification: formData.qualification?.trim() || '',
                    experience: formData.experience ? parseInt(formData.experience) : 0,
                    specialization: formData.specialization?.trim() || ''
                })
            };
            
            console.log('📤 Sending registration data:', registrationData);
            const result = await register(registrationData);
            
            if (result.success) {
                setSuccessMessage('✅ Registration successful! Redirecting to dashboard...');
                
                // Auto-redirect to dashboard
                setTimeout(() => {
                    navigate(`/${formData.role}/dashboard`);
                }, 2000);
            } else {
                setErrors({ 
                    submit: result.error || 'Registration failed. Please try again.' 
                });
            }
        } catch (error) {
            console.error('Registration error:', error);
            setErrors({ 
                submit: 'An unexpected error occurred. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };

    // Show backend connection error
    if (backendStatus === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200"
                    >
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                                <AlertCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Backend Server Not Running</h2>
                            <p className="text-gray-600 mb-6">
                                Please start the backend server to continue registration.
                            </p>
                            <button
                                onClick={checkBackendConnection}
                                className="w-full bg-gradient-to-r from-gray-900 to-blue-900 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Retry Connection
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    const roleIcons = {
        student: <GraduationCap className="h-6 w-6" />,
        teacher: <Users className="h-6 w-6" />
    };

    const roleDescriptions = {
        student: 'Student - Access academic results and progress',
        teacher: 'Teacher - Manage student data and marks'
    };

    const passwordRequirements = [
        { label: 'Minimum 8 characters', check: formData.password.length >= 8 },
        { label: 'Uppercase letter (A-Z)', check: /[A-Z]/.test(formData.password) },
        { label: 'Lowercase letter (a-z)', check: /[a-z]/.test(formData.password) },
        { label: 'Number (0-9)', check: /\d/.test(formData.password) },
        { label: 'Special character (@$!%*?&)', check: /[@$!%*?&]/.test(formData.password) }
    ];

    const allPasswordValid = passwordRequirements.every(req => req.check);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl w-full"
            >
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
                    <div className="md:flex">
                        {/* Left side - Info */}
                        <motion.div 
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="md:w-2/5 bg-gradient-to-br from-gray-900 to-blue-900 p-8 text-white"
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div>
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", delay: 0.3 }}
                                        className="flex items-center space-x-3 mb-6"
                                    >
                                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                            <Shield className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold">Academic Portal</h1>
                                            <p className="text-blue-100/80">Professional Management System</p>
                                        </div>
                                    </motion.div>
                                    
                                    <motion.h2 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-3xl font-bold mb-4 leading-tight"
                                    >
                                        Join Our<br />
                                        Academic Platform
                                    </motion.h2>
                                    
                                    <motion.p 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-blue-100/90 mb-8 text-sm"
                                    >
                                        Register to access academic results, performance analytics, and comprehensive management tools.
                                    </motion.p>
                                </div>
                                
                                <motion.div 
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="mt-6 pt-6 border-t border-white/20"
                                >
                                    <p className="text-blue-100/70 text-sm">
                                        Already have an account?{' '}
                                        <Link to="/login" className="text-white font-semibold hover:underline">
                                            Sign in here →
                                        </Link>
                                    </p>
                                </motion.div>
                            </div>
                        </motion.div>
                        
                        {/* Right side - Registration Form */}
                        <div className="md:w-3/5 p-6 md:p-8">
                            <form onSubmit={(e) => e.preventDefault()}>
                                {/* Progress Steps */}
                                <motion.div 
                                    initial={{ y: -10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="flex items-center justify-between mb-8"
                                >
                                    <div className="flex items-center">
                                        <motion.div 
                                            whileHover={{ scale: 1.1 }}
                                            className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                                                step >= 1 
                                                    ? 'bg-gradient-to-r from-gray-900 to-blue-900 text-white shadow-lg' 
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}
                                        >
                                            1
                                        </motion.div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-700">Account Details</p>
                                        </div>
                                    </div>
                                    
                                    <motion.div 
                                        className="flex-1 h-1 mx-4 bg-gray-200 rounded-full overflow-hidden"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                    >
                                        <motion.div 
                                            className="h-full bg-gradient-to-r from-gray-900 to-blue-900"
                                            initial={{ width: "0%" }}
                                            animate={{ width: step >= 2 ? "100%" : "50%" }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </motion.div>
                                    
                                    <div className="flex items-center">
                                        <motion.div 
                                            whileHover={{ scale: 1.1 }}
                                            className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                                                step >= 2 
                                                    ? 'bg-gradient-to-r from-gray-900 to-blue-900 text-white shadow-lg' 
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}
                                        >
                                            2
                                        </motion.div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-700">Profile Details</p>
                                        </div>
                                    </div>
                                </motion.div>
                                
                                <AnimatePresence mode="wait">
                                    {step === 1 ? (
                                        <motion.div
                                            key="step1"
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: -20, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-bold text-gray-900">
                                                    Create Account
                                                </h3>
                                                <p className="text-gray-600">Step 1: Account Information</p>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Full Name *
                                                    </label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            name="name"
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="John Doe"
                                                        />
                                                    </div>
                                                    {errors.name && (
                                                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Email Address *
                                                    </label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="you@example.com"
                                                        />
                                                    </div>
                                                    {errors.email && (
                                                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Password *
                                                    </label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            name="password"
                                                            value={formData.password}
                                                            onChange={handleChange}
                                                            className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="••••••••"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                        </button>
                                                    </div>
                                                    {errors.password && (
                                                        <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Confirm Password *
                                                    </label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                        <input
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            name="confirmPassword"
                                                            value={formData.confirmPassword}
                                                            onChange={handleChange}
                                                            className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="••••••••"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                        </button>
                                                    </div>
                                                    {errors.confirmPassword && (
                                                        <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Password Requirements */}
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                <p className="text-sm font-medium text-gray-700 mb-3">Password Requirements:</p>
                                                <ul className="space-y-2">
                                                    {passwordRequirements.map((req, index) => (
                                                        <li key={index} className="flex items-center text-sm">
                                                            {req.check ? (
                                                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-red-500 mr-2" />
                                                            )}
                                                            <span className={req.check ? 'text-green-600' : 'text-gray-600'}>
                                                                {req.label}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            
                                            {/* Role Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                                    Register as: *
                                                </label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {['student', 'teacher'].map((role) => (
                                                        <motion.button
                                                            key={role}
                                                            type="button"
                                                            onClick={() => handleChange({ target: { name: 'role', value: role } })}
                                                            whileHover={{ scale: 1.03 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className={`p-4 rounded-xl border-2 transition-all ${
                                                                formData.role === role
                                                                    ? 'border-blue-600 bg-blue-50'
                                                                    : 'border-gray-300 bg-white hover:border-gray-400'
                                                            }`}
                                                        >
                                                            <div className="flex flex-col items-center">
                                                                <div className={`p-2 rounded-lg mb-2 ${
                                                                    formData.role === role ? 'bg-blue-100' : 'bg-gray-100'
                                                                }`}>
                                                                    {roleIcons[role]}
                                                                </div>
                                                                <span className="font-medium text-gray-900 capitalize">{role}</span>
                                                                <p className="text-xs text-gray-500 mt-1 text-center">
                                                                    {roleDescriptions[role]}
                                                                </p>
                                                            </div>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {authError && (
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                                    <div className="flex items-center">
                                                        <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                                                        <p className="text-red-700">{authError}</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <motion.button
                                                type="button"
                                                onClick={handleNext}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                disabled={!allPasswordValid}
                                                className="w-full bg-gradient-to-r from-gray-900 to-blue-900 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Continue to Profile Details
                                                <ArrowRight className="inline-block ml-2 h-5 w-5" />
                                            </motion.button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="step2"
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: -20, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-bold text-gray-900">
                                                    {formData.role === 'student' ? 'Student Details' : 'Teacher Details'}
                                                </h3>
                                                <p className="text-gray-600">Step 2: Complete your profile</p>
                                            </div>
                                            
                                            <AnimatePresence mode="wait">
                                                {formData.role === 'student' ? (
                                                    <motion.div
                                                        key="studentForm"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="space-y-4"
                                                    >
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Roll Number *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    name="roll_no"
                                                                    value={formData.roll_no}
                                                                    onChange={handleChange}
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    placeholder="12345"
                                                                />
                                                                {errors.roll_no && (
                                                                    <p className="mt-1 text-sm text-red-600">{errors.roll_no}</p>
                                                                )}
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Student Name *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    name="student_name"
                                                                    value={formData.student_name}
                                                                    onChange={handleChange}
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    placeholder="Full name"
                                                                />
                                                                {errors.student_name && (
                                                                    <p className="mt-1 text-sm text-red-600">{errors.student_name}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Semester *
                                                                </label>
                                                                <select
                                                                    name="semester"
                                                                    value={formData.semester}
                                                                    onChange={handleChange}
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                >
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                                                        <option key={num} value={num}>
                                                                            Semester {num}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Program *
                                                                </label>
                                                                <select
                                                                    name="program"
                                                                    value={formData.program}
                                                                    onChange={handleChange}
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                >
                                                                    <option value="BCA">BCA</option>
                                                                    <option value="BSc CSIT">BSc CSIT</option>
                                                                    <option value="BIT">BIT</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Phone Number
                                                            </label>
                                                            <div className="relative">
                                                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                                <input
                                                                    type="tel"
                                                                    name="phone"
                                                                    value={formData.phone}
                                                                    onChange={handleChange}
                                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    placeholder="+977 98XXXXXXXX"
                                                                />
                                                            </div>
                                                            {errors.phone && (
                                                                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Date of Birth
                                                                </label>
                                                                <div className="relative">
                                                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                                    <input
                                                                        type="date"
                                                                        name="dob"
                                                                        value={formData.dob}
                                                                        onChange={handleChange}
                                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                        max={new Date().toISOString().split('T')[0]}
                                                                    />
                                                                </div>
                                                                {errors.dob && (
                                                                    <p className="mt-1 text-sm text-red-600">{errors.dob}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="teacherForm"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="space-y-4"
                                                    >
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Full Name *
                                                            </label>
                                                            <div className="relative">
                                                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                                <input
                                                                    type="text"
                                                                    name="teacher_name"
                                                                    value={formData.teacher_name}
                                                                    onChange={handleChange}
                                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    placeholder="Dr. John Smith"
                                                                />
                                                            </div>
                                                            {errors.teacher_name && (
                                                                <p className="mt-1 text-sm text-red-600">{errors.teacher_name}</p>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Department *
                                                                </label>
                                                                <div className="relative">
                                                                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                                    <select
                                                                        name="department"
                                                                        value={formData.department}
                                                                        onChange={handleChange}
                                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    >
                                                                        <option value="Computer Science">Computer Science</option>
                                                                        <option value="Information Technology">Information Technology</option>
                                                                        <option value="Mathematics">Mathematics</option>
                                                                        <option value="Physics">Physics</option>
                                                                    </select>
                                                                </div>
                                                                {errors.department && (
                                                                    <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                                                                )}
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Experience (Years)
                                                                </label>
                                                                <div className="relative">
                                                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                                    <input
                                                                        type="number"
                                                                        name="experience"
                                                                        value={formData.experience}
                                                                        onChange={handleChange}
                                                                        min="0"
                                                                        max="50"
                                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                        placeholder="5"
                                                                    />
                                                                </div>
                                                                {errors.experience && (
                                                                    <p className="mt-1 text-sm text-red-600">{errors.experience}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            
                                            {/* Error and Success Messages */}
                                            <AnimatePresence>
                                                {errors.submit && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="p-4 bg-red-50 border border-red-200 rounded-xl"
                                                    >
                                                        <div className="flex items-center">
                                                            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                                                            <p className="text-red-700">{errors.submit}</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                                
                                                {successMessage && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="p-4 bg-green-50 border border-green-200 rounded-xl"
                                                    >
                                                        <div className="flex items-center">
                                                            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                                                            <p className="text-green-700">{successMessage}</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            
                                            {/* Action Buttons */}
                                            <div className="flex space-x-4 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={handleBack}
                                                    disabled={loading}
                                                    className="flex-1 px-6 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    type="submit"
                                                    onClick={handleSubmit}
                                                    disabled={loading}
                                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {loading ? (
                                                        <div className="flex items-center justify-center">
                                                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                            Registering...
                                                        </div>
                                                    ) : (
                                                        'Complete Registration'
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                
                                {/* Terms and Login Link */}
                                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                                    <p className="text-gray-600 text-sm">
                                        By registering, you agree to our{' '}
                                        <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
                                        and{' '}
                                        <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                                    </p>
                                    <p className="text-gray-600 text-sm mt-2">
                                        Already have an account?{' '}
                                        <Link to="/login" className="text-gray-900 font-semibold hover:underline">
                                            Sign in here
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;