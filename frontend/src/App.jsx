import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import VerifyEmail from './pages/VerifyEmail';
// Role-specific pages
import AdminDashboard from './pages/admin/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import StudentDashboard from './pages/student/Dashboard';

// Layout
import Layout from './components/layout/Layout';

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* Protected Routes with Layout */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }>
                        {/* Redirect based on role */}
                        <Route index element={
                            <ProtectedRoute>
                                <NavigateToRoleDashboard />
                            </ProtectedRoute>
                        } />
                        
                        {/* Admin Routes */}
                        <Route path="admin">
                            <Route path="dashboard" element={
                                <ProtectedRoute roles={['admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            } />
                        </Route>
                        
                        {/* Teacher Routes */}
                        <Route path="teacher">
                            <Route path="dashboard" element={
                                <ProtectedRoute roles={['teacher']}>
                                    <TeacherDashboard />
                                </ProtectedRoute>
                            } />
                        </Route>
                        
                        {/* Student Routes */}
                        <Route path="student">
                            <Route path="dashboard" element={
                                <ProtectedRoute roles={['student']}>
                                    <StudentDashboard />
                                </ProtectedRoute>
                            } />
                        </Route>
<Route path="verify-email" element={<VerifyEmail />} />

                    </Route>
                        <Route path="verify-email" element={<VerifyEmail />} />
                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

// Helper component to redirect to role-specific dashboard
const NavigateToRoleDashboard = () => {
    const { user } = require('./context/AuthContext').useAuth();
    
    switch(user?.role) {
        case 'admin':
            return <Navigate to="/admin/dashboard" replace />;
        case 'teacher':
            return <Navigate to="/teacher/dashboard" replace />;
        case 'student':
            return <Navigate to="/student/dashboard" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
};

export default App;