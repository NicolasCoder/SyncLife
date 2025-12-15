
import React, { useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Home from './pages/Home';
import Finance from './pages/Finance';
import Tasks from './pages/Tasks';
import Auth from './pages/Auth';
import ActionModal from './components/ActionModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Helper component to access context inside Provider
const GlobalModalHandler: React.FC = () => {
  const { isModalOpen, closeModal, modalType } = useAppContext();
  return <ActionModal isOpen={isModalOpen} onClose={closeModal} type={modalType} />;
};

// Protected Route Wrapper
const ProtectedRoutes: React.FC = () => {
    const { session, loading, refreshData } = useAppContext();
    const location = useLocation();

    // Smart Refresh: Update data whenever the user navigates to a new page
    useEffect(() => {
        if (session && !loading) {
            refreshData();
        }
    }, [location.pathname]);

    if (loading) {
        return <div className="min-h-screen bg-[#101722] flex items-center justify-center text-white">Carregando...</div>;
    }

    if (!session) {
        return <Auth />;
    }

    return (
        <>
            <GlobalModalHandler />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <PWAInstallPrompt />
        </>
    );
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <MemoryRouter>
        <ProtectedRoutes />
      </MemoryRouter>
    </AppProvider>
  );
};

export default App;
