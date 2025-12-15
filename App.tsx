
import React, { useEffect, useState } from 'react';
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
    const [longLoading, setLongLoading] = useState(false);

    // Smart Refresh: Update data whenever the user navigates to a new page
    useEffect(() => {
        if (session && !loading) {
            refreshData();
        }
    }, [location.pathname]);

    // Check if loading is taking too long (e.g. Supabase connection issues)
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => setLongLoading(true), 5000); // 5 seconds alert
            return () => clearTimeout(timer);
        } else {
            setLongLoading(false);
        }
    }, [loading]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#101722] flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="animate-pulse">Carregando seus dados...</p>
                {longLoading && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-xs">
                        <p className="text-xs text-red-300">
                            Isso está demorando mais que o normal. Verifique sua conexão ou se as chaves do Supabase estão configuradas corretamente no Netlify.
                        </p>
                    </div>
                )}
            </div>
        );
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
