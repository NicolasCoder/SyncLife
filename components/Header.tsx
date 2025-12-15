
import React, { useState } from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import ProfileModal from './ProfileModal';
import NotificationsModal from './NotificationsModal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title = "SyncLife", subtitle }) => {
  const { userProfile, tasks } = useAppContext();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Simple badge logic
  const hasNotifications = tasks.some(t => t.date && t.date <= new Date().toISOString().split('T')[0] && !t.completed);

  return (
    <>
        <header className="flex items-center justify-between px-6 py-5 w-full max-w-[960px] mx-auto z-20 relative">
        <div className="flex items-center gap-3">
            {!subtitle ? (
                <>
                    <div className="size-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Icon name="bolt" className="text-lg" />
                    </div>
                    <span className="text-white/80 font-medium text-sm tracking-wide">{title}</span>
                </>
            ) : (
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
                    <p className="text-slate-400 text-sm font-normal">{subtitle}</p>
                </div>
            )}
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsNotifOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors text-white/70 hover:text-white relative"
            >
                <Icon name="notifications" />
                {hasNotifications && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#101722]"></span>}
            </button>
            <button 
                onClick={() => setIsProfileOpen(true)}
                title="Meu Perfil"
                className="size-9 rounded-full bg-cover bg-center border border-white/10 shadow-sm ring-2 ring-transparent hover:ring-primary/50 transition-all cursor-pointer relative group" 
                style={{backgroundImage: `url('${userProfile.avatar}')`}}
            >
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors"></div>
            </button>
        </div>
        </header>
        
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        <NotificationsModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
};

export default Header;
