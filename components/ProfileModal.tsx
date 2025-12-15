
import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { userProfile, updateUserProfile, signOut, session } = useAppContext();
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Reference to hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(userProfile.name);
            setAvatarUrl(userProfile.avatar);
        }
    }, [isOpen, userProfile]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await updateUserProfile(name, avatarUrl);
        setSaving(false);
        onClose();
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file || !session) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // 2. Get Public URL
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            if (data) {
                setAvatarUrl(data.publicUrl);
            }

        } catch (error) {
            console.error('Erro no upload:', error);
            alert('Erro ao fazer upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-sm bg-[#1a222e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="px-6 py-4 bg-[#151b26] border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-white font-semibold">Meu Perfil</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <Icon name="close" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    
                    {/* Avatar Upload Area */}
                    <div className="flex flex-col items-center gap-4">
                        <div 
                            className="group relative cursor-pointer"
                            onClick={triggerFileInput}
                        >
                            <div className={`w-24 h-24 rounded-full p-1 border-2 border-primary/30 relative transition-all group-hover:border-primary ${uploading ? 'opacity-50' : ''}`}>
                                <img 
                                    src={avatarUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'} 
                                    alt="Avatar" 
                                    className="w-full h-full rounded-full object-cover bg-white/5"
                                    onError={(e) => (e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/847/847969.png')}
                                />
                                
                                {/* Overlay icon on hover */}
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Icon name="photo_camera" className="text-white text-2xl" />
                                </div>

                                {/* Loading Spinner */}
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 shadow-lg border border-[#1a222e] group-hover:scale-110 transition-transform">
                                    <Icon name="edit" className="text-xs text-white" />
                                </div>
                            </div>
                        </div>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />

                        <p className="text-xs text-slate-500">Clique na foto para alterar</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome de Exibição</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Seu nome"
                            />
                        </div>
                        
                        {/* Option to still paste URL manually if preferred, but collapsed/secondary */}
                         <div className="pt-2">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">Ou cole uma URL (Opcional)</label>
                            <div className="flex items-center bg-[#111722] border border-white/10 rounded-xl px-3 py-2">
                                <Icon name="link" className="text-slate-500 text-sm mr-2" />
                                <input 
                                    type="text" 
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    className="w-full bg-transparent border-none text-xs text-slate-400 focus:text-white outline-none"
                                    placeholder="https://exemplo.com/foto.png"
                                />
                            </div>
                        </div>

                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                            <div className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-slate-400 text-sm flex items-center justify-between">
                                {session?.user.email}
                                <Icon name="lock" className="text-xs opacity-50" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        <button 
                            type="submit" 
                            disabled={saving || uploading}
                            className="w-full py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => {
                                onClose();
                                signOut();
                            }} 
                            className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <Icon name="logout" className="text-sm" />
                            Sair da Conta
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
