// frontend/src/pages/VerifyEmail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Mail, Lock, RefreshCw, CheckCircle, XCircle, 
    Shield, Timer, AlertCircle, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';

const VerifyEmail = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timer, setTimer] = useState(600); // 10 minutes
    const [canResend, setCanResend] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get user data from location state or localStorage
    useEffect(() => {
        if (location.state?.user_id && location.state?.email) {
            setUserData({
                user_id: location.state.user_id,
                email: location.state.email
            });
            console.log('Got user data from location state:', location.state);
        } else {
            const storedData = localStorage.getItem('pending_verification');
            if (storedData) {
                const data = JSON.parse(storedData);
                setUserData(data);
                console.log('Got user data from localStorage:', data);
            } else {
                console.log('No user data found, redirecting to register');
                navigate('/register');
            }
        }
    }, [location, navigate]);
    
    // Timer countdown
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);
    
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const handleCodeChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        
        // Auto-focus next input
        if (value !== '' && index < 5) {
            document.getElementById(`code-${index + 1}`).focus();
        }
        
        // Auto-submit when all digits are entered
        if (index === 5 && value !== '') {
            const fullCode = newCode.join('');
            if (fullCode.length === 6) {
                handleVerify(fullCode);
            }
        }
    };
    
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && code[index] === '' && index > 0) {
            document.getElementById(`code-${index - 1}`).focus();
        }
    };
    
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        
        if (/^\d{6}$/.test(pastedData)) {
            const digits = pastedData.split('');
            const newCode = [...code];
            
            digits.forEach((digit, index) => {
                if (index < 6) {
                    newCode[index] = digit;
                }
            });
            
            setCode(newCode);
            
            setTimeout(() => {
                document.getElementById(`code-${Math.min(5, digits.length - 1)}`).focus();
            }, 10);
            
            if (pastedData.length === 6) {
                handleVerify(pastedData);
            }
        }
    };
    
    const handleVerify = async (verificationCode = null) => {
        const codeToVerify = verificationCode || code.join('');
        
        if (codeToVerify.length !== 6 || !/^\d+$/.test(codeToVerify)) {
            setError('Please enter a valid 6-digit code');
            return;
        }
        
        if (!userData?.user_id) {
            setError('User information not found');
            return;
        }
        
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            console.log('Verifying code for user:', userData.user_id);
            const response = await api.post('/auth/verify-email', {
                user_id: userData.user_id,
                code: codeToVerify
            });
            
            if (response.data.success) {
                setSuccess('✅ Email verified successfully!');
                
                // Store token
                const { token, user } = response.data.data;
                localStorage.setItem('token', token);
                localStorage.removeItem('pending_verification');
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                console.log('Verification successful, user role:', user.role);
                
                // Show success message for 2 seconds, then redirect
                setTimeout(() => {
                    switch(user.role) {
                        case 'admin':
                            navigate('/admin/dashboard');
                            break;
                        case 'teacher':
                            navigate('/teacher/dashboard');
                            break;
                        case 'student':
                            navigate('/student/dashboard');
                            break;
                        default:
                            navigate('/dashboard');
                    }
                }, 2000);
            } else {
                setError(response.data.message || 'Verification failed');
                setCode(['', '', '', '', '', '']);
                document.getElementById('code-0').focus();
            }
        } catch (error) {
            console.error('Verification error:', error);
            setError(error.response?.data?.message || 'Verification failed. Please try again.');
            setCode(['', '', '', '', '', '']);
            document.getElementById('code-0').focus();
        } finally {
            setLoading(false);
        }
    };
    
    const handleResendCode = async () => {
        if (!userData?.user_id || !userData?.email) {
            setError('Cannot resend code. User information missing.');
            return;
        }
        
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await api.post('/auth/resend-verification', {
                user_id: userData.user_id,
                email: userData.email
            });
            
            if (response.data.success) {
                setSuccess('✅ New verification code sent! Check your email.');
                setTimer(600); // Reset timer to 10 minutes
                setCanResend(false);
                setCode(['', '', '', '', '', '']);
                document.getElementById('code-0').focus();
            } else {
                setError(response.data.message || 'Failed to resend code');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };
    
    if (!userData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full"
            >
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                    {/* Back button */}
                    <button
                        onClick={() => navigate('/register')}
                        className="flex items-center text-gray-300 hover:text-white mb-6"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Registration
                    </button>
                    
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4"
                        >
                            <Shield className="h-8 w-8 text-white" />
                        </motion.div>
                        <h1 className="text-3xl font-bold text-white mb-2">Verify Your Email</h1>
                        <p className="text-gray-300">
                            Enter the 6-digit code sent to
                            <br />
                            <span className="font-semibold text-blue-300">{userData.email}</span>
                        </p>
                    </div>
                    
                    {/* Timer */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-300 flex items-center">
                                <Timer className="h-4 w-4 mr-2" />
                                Code expires in
                            </span>
                            <span className={`text-sm font-bold ${timer < 60 ? 'text-red-400' : 'text-green-400'}`}>
                                {formatTime(timer)}
                            </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                                style={{ width: `${(timer / 600) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    {/* Code Input */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
                            Enter 6-digit verification code
                        </label>
                        
                        <div className="flex justify-center space-x-3 mb-6" onPaste={handlePaste}>
                            {code.map((digit, index) => (
                                <motion.input
                                    key={index}
                                    id={`code-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-14 h-14 text-center text-2xl font-bold bg-white/10 border-2 border-gray-600 text-white rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                                    disabled={loading}
                                    autoFocus={index === 0}
                                    whileFocus={{ scale: 1.1 }}
                                />
                            ))}
                        </div>
                        
                        <div className="text-center">
                            <motion.button
                                onClick={() => handleVerify()}
                                disabled={loading || code.join('').length !== 6}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Verifying...
                                    </div>
                                ) : (
                                    'Verify Email'
                                )}
                            </motion.button>
                        </div>
                    </div>
                    
                    {/* Messages */}
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                        >
                            <div className="flex items-center">
                                <XCircle className="h-5 w-5 text-red-400 mr-2" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        </motion.div>
                    )}
                    
                    {success && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                        >
                            <div className="flex items-center">
                                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                                <p className="text-green-300 text-sm">{success}</p>
                            </div>
                        </motion.div>
                    )}
                    
                    {/* Resend Code */}
                    <div className="text-center">
                        <p className="text-gray-400 text-sm mb-4">
                            Didn't receive the code?
                        </p>
                        
                        <motion.button
                            onClick={handleResendCode}
                            disabled={!canResend || loading}
                            whileHover={{ scale: canResend ? 1.05 : 1 }}
                            className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {canResend ? 'Resend Code' : `Resend available in ${formatTime(timer)}`}
                        </motion.button>
                    </div>
                    
                    {/* Instructions */}
                    <div className="mt-8 pt-6 border-t border-gray-700">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-medium text-white mb-2">Important:</h3>
                                <ul className="text-sm text-gray-400 space-y-1">
                                    <li>• Check your spam folder if you don't see the email</li>
                                    <li>• The code is valid for 10 minutes only</li>
                                    <li>• You can request a new code after expiry</li>
                                    <li>• Contact support if you continue having issues</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default VerifyEmail;