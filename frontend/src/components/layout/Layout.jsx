import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <div className="lg:pl-64">
                <Header />
                <main className="py-6">
                    <div className="mx-auto px-4 sm:px-6 lg:px-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;