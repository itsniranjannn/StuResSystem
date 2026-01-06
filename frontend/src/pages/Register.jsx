import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Award, Mail, Lock, User, Phone, BookOpen, 
    GraduationCap, Calendar, MapPin, Eye, EyeOff,
    CheckCircle, XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Basic info
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
        
        // Student specific
        roll_no: '',
        student_name: '',
        semester: 6,
        program: 'BCA',
        phone: '',
        address: '',
        dob: '',
        
        // Teacher specific
        teacher_name: '',
        department: 'Computer Science'
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    
    const { register } = useAuth();
    const navigate = useNavigate();
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
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
        
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
        
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        
        if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
        else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        
        if (!formData.role) newErrors.role = 'Please select a role';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const validateStep2 = () => {
        const newErrors = {};
        
        if (formData.role === 'student') {
            if (!formData.roll_no.trim()) newErrors.roll_no = 'Roll number is required';
            if (!formData.student_name.trim()) newErrors.student_name = 'Student name is required';
            if (!formData.semester) newErrors.semester = 'Semester is required';
        } else if (formData.role === 'teacher') {
            if (!formData.teacher_name.trim()) newErrors.teacher_name = 'Teacher name is required';
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
    };
    
const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) {
        return;
    }
    
    setLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
        const result = await register(formData);
        
        if (result.success) {
            // Store pending verification data
            const pendingData = {
                user_id: result.data.user_id,
                email: formData.email
            };
            localStorage.setItem('pending_verification', JSON.stringify(pendingData));
            
            // Redirect to verification page
            navigate('/verify-email', { 
                state: pendingData 
            });
        } else {
            setErrors({ submit: result.error || 'Registration failed' });
        }
    } catch (error) {
        setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
        setLoading(false);
    }
};
    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h3>
                <p className="text-gray-600">Step 1: Basic Information</p>
            </div>
            
            {/* Role Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    I am a
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['student', 'teacher', 'admin'].map((role) => (
                        <button
                            key={role}
                            type="button"
                            onClick={() => handleChange({ target: { name: 'role', value: role } })}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                formData.role === role
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                            <div className="flex flex-col items-center">
                                <div className={`p-2 rounded-lg mb-2 ${
                                    formData.role === role ? 'bg-blue-100' : 'bg-gray-100'
                                }`}>
                                    {role === 'student' && <BookOpen className="h-6 w-6" />}
                                    {role === 'teacher' && <GraduationCap className="h-6 w-6" />}
                                    {role === 'admin' && <Award className="h-6 w-6" />}
                                </div>
                                <span className="font-medium capitalize">{role}</span>
                            </div>
                        </button>
                    ))}
                </div>
                {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
            </div>
            
            {/* Name & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="John Doe"
                        />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="you@example.com"
                        />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
            </div>
            
            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="pl-10 pr-12 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="pl-10 pr-12 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>
            </div>
            
            {/* Password Requirements */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Password must contain:</p>
                <ul className="space-y-1">
                    <li className={`flex items-center text-sm ${formData.password.length >= 6 ? 'text-green-600' : 'text-gray-500'}`}>
                        {formData.password.length >= 6 ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                        At least 6 characters
                    </li>
                    <li className={`flex items-center text-sm ${formData.password === formData.confirmPassword && formData.confirmPassword ? 'text-green-600' : 'text-gray-500'}`}>
                        {formData.password === formData.confirmPassword && formData.confirmPassword ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                        Passwords match
                    </li>
                </ul>
            </div>
            
            <button
                type="button"
                onClick={handleNext}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
                Continue
            </button>
        </div>
    );
    
    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {formData.role === 'student' ? 'Student Details' : 'Teacher Details'}
                </h3>
                <p className="text-gray-600">Step 2: Complete your profile</p>
            </div>
            
            {formData.role === 'student' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Roll Number
                            </label>
                            <input
                                type="text"
                                name="roll_no"
                                value={formData.roll_no}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="BCA24001"
                            />
                            {errors.roll_no && <p className="mt-1 text-sm text-red-600">{errors.roll_no}</p>}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Student Name (As per TU)
                            </label>
                            <input
                                type="text"
                                name="student_name"
                                value={formData.student_name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="John Doe"
                            />
                            {errors.student_name && <p className="mt-1 text-sm text-red-600">{errors.student_name}</p>}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Semester
                            </label>
                            <select
                                name="semester"
                                value={formData.semester}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                    <option key={sem} value={sem}>Semester {sem}</option>
                                ))}
                            </select>
                            {errors.semester && <p className="mt-1 text-sm text-red-600">{errors.semester}</p>}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Program
                            </label>
                            <select
                                name="program"
                                value={formData.program}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="BCA">BCA</option>
                                <option value="BBA">BBA</option>
                                <option value="BIT">BIT</option>
                                <option value="BSW">BSW</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="+977 98XXXXXXXX"
                                />
                            </div>
                        </div>
                        
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
                                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                rows="3"
                                className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your address"
                            />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teacher Name
                        </label>
                        <input
                            type="text"
                            name="teacher_name"
                            value={formData.teacher_name}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Dr. John Smith"
                        />
                        {errors.teacher_name && <p className="mt-1 text-sm text-red-600">{errors.teacher_name}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Department
                        </label>
                        <select
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="Computer Science">Computer Science</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="English">English</option>
                            <option value="Management">Management</option>
                        </select>
                    </div>
                </>
            )}
            
            {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{errors.submit}</p>
                </div>
            )}
            
            {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm">{successMessage}</p>
                </div>
            )}
            
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                    Back
                </button>
                
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Creating Account...
                        </div>
                    ) : (
                        'Create Account'
                    )}
                </button>
            </div>
        </div>
    );
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="md:flex">
                        {/* Left side - Brand Info */}
                        <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-500 p-8 text-white hidden md:block">
                            <div className="h-full flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-8">
                                        <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                                            <Award className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold">Student Result System</h1>
                                            <p className="text-blue-100">Tribhuvan University</p>
                                        </div>
                                    </div>
                                    
                                    <h2 className="text-3xl font-bold mb-4">
                                        Join Our Academic Community
                                    </h2>
                                    <p className="text-blue-100 mb-8">
                                        Register to access your academic records, track performance, and stay updated with results.
                                    </p>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                                            <span className="text-lg">🎓</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Academic Tracking</h3>
                                            <p className="text-sm text-blue-100">Monitor your performance</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                                            <span className="text-lg">📊</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Real-time Results</h3>
                                            <p className="text-sm text-blue-100">Instant result updates</p>
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
                        
                        {/* Right side - Registration Form */}
                        <div className="md:w-1/2 p-8">
                            <div className="md:hidden mb-8">
                                <div className="flex items-center space-x-3">
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center">
                                        <Award className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">Student Result System</h1>
                                        <p className="text-gray-600">Tribhuvan University</p>
                                    </div>
                                </div>
                            </div>
                            
                            <form onSubmit={(e) => e.preventDefault()}>
                                {/* Progress Steps */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            1
                                        </div>
                                        <div className="ml-2">
                                            <p className="text-sm font-medium">Basic Info</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 h-1 mx-4 bg-gray-200"></div>
                                    <div className="flex items-center">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            2
                                        </div>
                                        <div className="ml-2">
                                            <p className="text-sm font-medium">Details</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {step === 1 ? renderStep1() : renderStep2()}
                                
                                <div className="mt-8 pt-8 border-t border-gray-200">
                                    <p className="text-gray-600 text-sm text-center">
                                        Already have an account?{' '}
                                        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                                            Sign in here
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;