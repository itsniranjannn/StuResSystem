import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Mail, Lock, RefreshCw, CheckCircle, XCircle, 
    Shield, Timer, AlertCircle
} from 'lucide-react';
import api from '../services/api';

const VerifyEmail = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timer, setTimer] = useState(600); // 10 minutes in seconds
    const [canResend, setCanResend] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get user data from location state
    useEffect(() => {
        if (location.state?.user_id && location.state?.email) {
            setUserData({
                user_id: location.state.user_id,
                email: location.state.email
            });
        } else {
            // Try to get from localStorage
            const storedData = localStorage.getItem('pending_verification');
            if (storedData) {
                const data = JSON.parse(storedData);
                setUserData(data);
            } else {
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
    
    // Format timer
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Handle code input
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
    
    // Handle backspace
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && code[index] === '' && index > 0) {
            document.getElementById(`code-${index - 1}`).focus();
        }
    };
    
    // Paste code from clipboard
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
            
            // Focus last input
            setTimeout(() => {
                document.getElementById(`code-${Math.min(5, digits.length - 1)}`).focus();
            }, 10);
            
            // Auto-submit
            if (pastedData.length === 6) {
                handleVerify(pastedData);
            }
        }
    };
    
    // Verify code
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
            const response = await api.post('/auth/verify-email', {
                user_id: userData.user_id,
                code: codeToVerify
            });
            
            if (response.data.success) {
                setSuccess('Email verified successfully!');
                
                // Store token
                const { token, user } = response.data.data;
                localStorage.setItem('token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                // Clear pending verification
                localStorage.removeItem('pending_verification');
                
                // Show success message for 2 seconds, then redirect
                setTimeout(() => {
                    // Redirect based on role
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
                // Clear code on error
                setCode(['', '', '', '', '', '']);
                document.getElementById('code-0').focus();
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Verification failed. Please try again.');
            // Clear code on error
            setCode(['', '', '', '', '', '']);
            document.getElementById('code-0').focus();
        } finally {
            setLoading(false);
        }
    };
    
    // Resend code
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
                setSuccess('New verification code sent! Check your email.');
                setTimer(600); // Reset timer to 10 minutes
                setCanResend(false);
                setCode(['', '', '', '', '', '']); // Clear code
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center mx-auto mb-4">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
                        <p className="text-gray-600">
                            Enter the 6-digit code sent to
                            <br />
                            <span className="font-semibold text-blue-600">{userData.email}</span>
                        </p>
                    </div>
                    
                    {/* Timer */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 flex items-center">
                                <Timer className="h-4 w-4 mr-2" />
                                Code expires in
                            </span>
                            <span className={`text-sm font-bold ${timer < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                                {formatTime(timer)}
                            </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000"
                                style={{ width: `${(timer / 600) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    {/* Code Input */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                            Enter 6-digit verification code
                        </label>
                        
                        <div className="flex justify-center space-x-3 mb-6" onPaste={handlePaste}>
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`code-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    disabled={loading}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>
                        
                        <div className="text-center">
                            <button
                                onClick={() => handleVerify()}
                                disabled={loading || code.join('').length !== 6}
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Verifying...
                                    </div>
                                ) : (
                                    'Verify Email'
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* Messages */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center">
                                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        </div>
                    )}
                    
                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                <p className="text-green-700 text-sm">{success}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Resend Code */}
                    <div className="text-center">
                        <p className="text-gray-600 text-sm mb-4">
                            Didn't receive the code?
                        </p>
                        
                        <button
                            onClick={handleResendCode}
                            disabled={!canResend || loading}
                            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {canResend ? 'Resend Code' : `Resend available in ${formatTime(timer)}`}
                        </button>
                    </div>
                    
                    {/* Instructions */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Important:</h3>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Check your spam folder if you don't see the email</li>
                                    <li>• The code is valid for 10 minutes only</li>
                                    <li>• You can request a new code after expiry</li>
                                    <li>• Contact support if you continue having issues</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    {/* Back to Register */}
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => navigate('/register')}
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            ← Back to Registration
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;