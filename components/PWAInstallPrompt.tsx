import React, { useState, useEffect } from 'react';
import Icon from './Icon';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Check if already in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return; // Don't show if already installed
    }

    // 2. Listen for the browser event
    const handler = (e: Event) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the UI
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Reset
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[999] animate-fade-in-up">
      <div className="bg-[#1a222e]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 relative overflow-hidden">
        
        {/* Glow Effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500"></div>

        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                <Icon name="bolt" className="text-white text-2xl" />
            </div>
            <div>
                <h3 className="text-white font-semibold text-sm">Instalar App</h3>
                <p className="text-slate-400 text-xs">Acesso rápido e offline</p>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsVisible(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
            >
                <Icon name="close" />
            </button>
            <button 
                onClick={handleInstallClick}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
            >
                Instalar
            </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;