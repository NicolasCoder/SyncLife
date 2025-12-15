
import React, { useEffect, useState, Suspense } from 'react';
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Auth from './pages/Auth';
import ActionModal from './components/ActionModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Lazy Load heavy components to isolate crashes
const Home = React.lazy(() => import('./pages/Home'));
const Finance = React.lazy(() => import('./pages/Finance'));
const Tasks = React.lazy(() => import('./pages/Tasks'));

const GlobalModalHandler: React.FC = () => {
  const { isModalOpen, closeModal, modalType } = useAppContext();
  return <ActionModal isOpen={isModalOpen} onClose={closeModal} type={modalType} />;
};

// Inline styles for high reliability
const LoadingScreen = () => (
    <div style={{
        minHeight: '100vh',
        backgroundColor: '#101722',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        flexDirection: 'column'
    }} className="min-h-screen bg-[#101722] flex flex-col items-center justify-center text-white">
        <div style={{
            width: '32px',
            height: '32px',
            border: '4px solid #3484f4',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
        }} className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <span style={{fontSize: '14px', opacity: 0.7}}>Carregando...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
);

const ProtectedRoutes: React.FC = () => {
    const { session, loading, refreshData } = useAppContext();
    const location = useLocation();

    useEffect(() => {
        if (session && !loading) refreshData();
    }, [location.pathname]);

    if (loading) return <LoadingScreen />;

    if (!session) {
        return <Auth />;
    }

    return (
        <>
            <GlobalModalHandler />
            <Suspense fallback={<LoadingScreen />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Suspense>
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
