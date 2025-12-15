
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Icon from '../components/Icon';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            else alert("Cadastro realizado! Verifique seu email (ou faça login se a confirmação estiver desativada).");
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        }
    } catch (error: any) {
        setErrorMsg(error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101722] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]"></div>

        <div className="w-full max-w-md bg-[#1a222e] border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 animate-fade-in-up">
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
                     <Icon name="bolt" className="text-3xl text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo ao SyncLife</h1>
                <p className="text-slate-400 text-sm">Organize suas finanças e tarefas com IA.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-slate-400 mb-1 block ml-1">Email</label>
                    <div className="relative">
                        <Icon name="mail" className="absolute left-3 top-3.5 text-slate-500 text-sm" />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#111722] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none transition-colors"
                            placeholder="seu@email.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-400 mb-1 block ml-1">Senha</label>
                    <div className="relative">
                        <Icon name="lock" className="absolute left-3 top-3.5 text-slate-500 text-sm" />
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#111722] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none transition-colors"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                        {errorMsg}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3.5 bg-primary rounded-xl text-white font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 mt-2"
                >
                    {loading ? 'Carregando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                    {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default Auth;
