
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

const LoadingScreen = () => (
    <div className="min-h-screen bg-[#101722] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
