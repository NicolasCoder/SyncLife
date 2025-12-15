
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';

const FloatingNav: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { setPendingAudio } = useAppContext();
    const path = location.pathname;

    const isActive = (p: string) => path === p;

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioLevel, setAudioLevel] = useState(1);
    
    // Refs for Audio API
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const longPressTimer = useRef<any>(null);
    const isLongPressTriggered = useRef(false);
    const isPressingRef = useRef(false); // Nova ref para rastrear se o usuário está realmente pressionando

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const startAudioVisualizer = (stream: MediaStream) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioCtx = audioContextRef.current;
        if (audioCtx.state === 'suspended') {
             audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        sourceRef.current = audioCtx.createMediaStreamSource(stream);
        sourceRef.current.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for(let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            // Map 0-255 to 1.0-2.0 scale for CSS transform
            const scale = 1 + (average / 255) * 1.5; 
            setAudioLevel(scale);
            
            animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            // Start Visualizer
            startAudioVisualizer(stream);

            // Start Recorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Use webm/opus
                
                // --- DISPATCH TO AI HANDLER ---
                // Only send if we have meaningful data size
                if (audioBlob.size > 1000) { 
                    setPendingAudio(audioBlob);
                    // Navigate to home if not there, because AI lives in Home
                    if (location.pathname !== '/') {
                        navigate('/');
                    }
                }

                // Cleanup stream
                stream.getTracks().forEach(track => track.stop());
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                setAudioLevel(1);
            };

            mediaRecorder.start();
            setIsRecording(true);
            if (navigator.vibrate) navigator.vibrate(50);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Permissão de microfone negada. Verifique suas configurações.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        }
    };

    const handleStartParams = () => {
        isPressingRef.current = true;
        isLongPressTriggered.current = false;
        longPressTimer.current = setTimeout(() => {
            // Só inicia gravação se ainda estiver pressionando
            if (isPressingRef.current) {
                isLongPressTriggered.current = true;
                startRecording();
            }
        }, 400); // 400ms hold to start
    };

    const handleEndParams = () => {
        // Se não iniciou o clique neste elemento (ex: apenas passou o mouse), ignora
        if (!isPressingRef.current) return;
        
        isPressingRef.current = false;

        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }

        if (isRecording) {
            stopRecording();
        } else if (!isLongPressTriggered.current) {
            // Comportamento de clique normal (tap)
            if (location.pathname !== '/') {
                navigate('/');
            }
        }
    };

    return (
        <div className="fixed bottom-0 left-0 w-full flex justify-center pb-6 z-50 pointer-events-none animate-fade-in-up">
            <nav className="pointer-events-auto glass-panel flex items-center gap-4 px-4 py-3 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-xl bg-[#151b26]/80 relative">
                
                {/* Finance Tab */}
                <Link 
                    to="/finance"
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 group ${
                        isActive('/finance') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Icon 
                        name="account_balance_wallet" 
                        className={`text-[26px] mb-1 transition-transform group-hover:-translate-y-0.5 ${isActive('/finance') ? 'scale-110' : ''}`} 
                        filled={isActive('/finance')} 
                    />
                    <span className={`text-[10px] font-medium ${isActive('/finance') ? 'opacity-100' : 'opacity-60'}`}>
                        Finanças
                    </span>
                    {isActive('/finance') && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"></span>}
                </Link>

                {/* Center FAB - Voice Recorder */}
                <div className="relative -mt-8 mb-2 w-16 h-16 flex items-center justify-center">
                    
                    {/* Audio Visualization Rings (Only visible when recording) */}
                    {isRecording && (
                        <>
                            <div 
                                className="absolute inset-0 rounded-full bg-red-500 opacity-20 transition-all duration-75 ease-out"
                                style={{ transform: `scale(${audioLevel + 0.3})` }}
                            ></div>
                            <div 
                                className="absolute inset-0 rounded-full bg-red-500 opacity-40 transition-all duration-75 ease-out"
                                style={{ transform: `scale(${audioLevel})` }}
                            ></div>
                        </>
                    )}

                    {/* Passive "Home" Indicator Pulse */}
                    {!isRecording && isActive('/') && (
                         <div className="absolute inset-0 rounded-full animate-ping bg-primary opacity-20 pointer-events-none"></div>
                    )}

                    <button 
                        onMouseDown={handleStartParams}
                        onMouseUp={handleEndParams}
                        onMouseLeave={handleEndParams}
                        onTouchStart={handleStartParams}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            handleEndParams();
                        }}
                        className={`relative group flex items-center justify-center w-full h-full rounded-full text-white shadow-lg hover:scale-105 transition-all duration-300 border-4 border-background-dark z-10 select-none ${
                            isRecording 
                            ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] border-red-900/30' 
                            : 'bg-primary shadow-[0_0_20px_rgba(52,132,244,0.4)] hover:shadow-[0_0_30px_rgba(52,132,244,0.6)]'
                        }`}
                    >
                        <div className="absolute inset-0 rounded-full border border-white/20"></div>
                        
                        <Icon 
                            name={isRecording ? "mic" : "add"} 
                            className={`text-4xl transition-all duration-300 ${
                                isRecording 
                                ? 'scale-110 animate-pulse' 
                                : isActive('/') ? 'rotate-90' : 'group-hover:rotate-90'
                            }`} 
                        />
                    </button>
                </div>

                {/* Tasks Tab */}
                <Link 
                    to="/tasks"
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 group ${
                        isActive('/tasks') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Icon 
                        name="check_circle" 
                        className={`text-[26px] mb-1 transition-transform group-hover:-translate-y-0.5 ${isActive('/tasks') ? 'scale-110' : ''}`} 
                        filled={isActive('/tasks')} 
                    />
                    <span className={`text-[10px] font-medium ${isActive('/tasks') ? 'opacity-100' : 'opacity-60'}`}>
                        Tarefas
                    </span>
                    {isActive('/tasks') && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"></span>}
                </Link>

            </nav>
        </div>
    );
};

export default FloatingNav;
