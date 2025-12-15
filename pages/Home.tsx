import React, { useState, useEffect, useRef } from 'react';
import FloatingNav from '../components/FloatingNav';
import Header from '../components/Header';
import Icon from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { GoogleGenAI, Type, FunctionDeclaration, Chat, GenerateContentResponse, Part } from "@google/genai";

// --- TYPES ---
interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'system';
    text: string;
    image?: string; // Base64 full string (data:image...) for display
    isAction?: boolean; 
}

// --- INIT GEMINI ---
const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
    try {
        ai = new GoogleGenAI({ apiKey: apiKey });
    } catch (e) {
        console.error("Erro ao inicializar Gemini:", e);
    }
} else {
    console.warn("Gemini API Key ausente.");
}

// Helper for Base64 conversion
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const Home: React.FC = () => {
    const { 
        userProfile, 
        addTransaction, 
        deleteTransaction,
        transactions,
        addTask, 
        updateTask, 
        deleteTask,
        tasks,
        cards,
        pendingAudio,
        setPendingAudio
    } = useAppContext();
    
    // Command Bar State
    const [mainInput, setMainInput] = useState('');
    const [showAttachments, setShowAttachments] = useState(false);
    const [activeAttachment, setActiveAttachment] = useState<string | null>(null); // Base64 for display

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Refs
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isChatOpen]);

    // Focus input when chat opens
    useEffect(() => {
        if (isChatOpen) {
            setTimeout(() => chatInputRef.current?.focus(), 100);
            if (!chatSessionRef.current) {
                initChat();
            }
        } else {
            // Optional: reset chat on close? Keeping it for now.
            // chatSessionRef.current = null;
            // setMessages([]);
        }
    }, [isChatOpen]);

    // --- HANDLE PENDING AUDIO (VOICE COMMAND) ---
    useEffect(() => {
        const handleVoiceCommand = async () => {
            if (pendingAudio) {
                setIsChatOpen(true);
                addMessage('user', '🎤 Áudio enviado...');
                setIsTyping(true);
                
                try {
                    const base64Audio = await blobToBase64(pendingAudio);
                    
                    if (!chatSessionRef.current) initChat();
                    const session = chatSessionRef.current;
                    
                    if (!session) {
                        throw new Error("Chat indisponível (API Key inválida?)");
                    }

                    let response = await session.sendMessage({
                        message: [
                            {
                                inlineData: {
                                    mimeType: "audio/webm",
                                    data: base64Audio
                                }
                            },
                            {
                                text: "Transcreva este áudio exatamente e, em seguida, execute o comando solicitado ou responda à pergunta. Se for um comando de criação (tarefa/gasto), execute a tool."
                            }
                        ]
                    });

                    await handleModelResponse(session, response);

                } catch (error) {
                    console.error("Audio processing error:", error);
                    addMessage('system', "Erro ao processar áudio. Verifique sua conexão ou a chave de API.");
                } finally {
                    setIsTyping(false);
                    setPendingAudio(null);
                }
            }
        };

        handleVoiceCommand();
    }, [pendingAudio]);

    // --- TOOL DEFINITIONS ---
    const createTransactionTool: FunctionDeclaration = {
        name: "createTransaction",
        description: "Registrar uma nova transação financeira (gasto ou ganho).",
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ["expense", "income"] },
                paymentMethod: { type: Type.STRING, enum: ["pix", "credit_card", "cash"] },
                cardKeyword: { type: Type.STRING },
                categoryIcon: { type: Type.STRING }
            },
            required: ["name", "amount", "type"]
        }
    };
    
    const deleteTransactionTool: FunctionDeclaration = {
        name: "deleteTransaction",
        description: "Remover uma transação existente.",
        parameters: {
            type: Type.OBJECT,
            properties: { keyword: { type: Type.STRING } },
            required: ["keyword"]
        }
    };

    const createTaskTool: FunctionDeclaration = {
        name: "createTask",
        description: "Criar uma nova tarefa.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                categoryIcon: { type: Type.STRING },
                date: { type: Type.STRING }
            },
            required: ["title"]
        }
    };

    const updateTaskTool: FunctionDeclaration = {
        name: "updateTask",
        description: "Atualizar status ou deletar uma tarefa.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                keyword: { type: Type.STRING },
                action: { type: Type.STRING, enum: ["complete", "delete", "reschedule"] },
                newDate: { type: Type.STRING }
            },
            required: ["keyword", "action"]
        }
    };

    // --- AI LOGIC ---

    const initChat = () => {
        if (!ai) {
            // addMessage('system', 'Erro: API Key não configurada.');
            return;
        }

        const now = new Date();
        const fullDate = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const isoDate = now.toISOString().split('T')[0];
        const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const tasksSummary = tasks.slice(0, 15).map(t => `- [${t.completed ? 'X' : ' '}] ${t.title} (${t.date})`).join('\n');
        const transSummary = transactions.slice(0, 10).map(t => `- ${t.name}: R$${t.amount} (${t.type})`).join('\n');
        const cardsSummary = cards.map(c => `- ${c.name} (Final ${c.lastDigits})`).join('\n');

        chatSessionRef.current = ai.chats.create({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: `Você é a 'SyncLife Assistant'.
                Hoje: ${fullDate} (${isoDate}). Hora: ${time}.
                
                DADOS:
                Cartões: ${cardsSummary || "Nenhum."}
                Tarefas: ${tasksSummary}
                Transações: ${transSummary}
                
                Responda de forma direta. Use tools para ações. Se o usuário enviar uma imagem, analise-a.`,
                tools: [{ functionDeclarations: [createTransactionTool, deleteTransactionTool, createTaskTool, updateTaskTool] }],
            }
        });
    };

    const addMessage = (role: 'user' | 'model' | 'system', text: string, isAction = false, image?: string) => {
        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            role,
            text,
            isAction,
            image
        }]);
    };

    const handleModelResponse = async (session: Chat, initialResponse: GenerateContentResponse) => {
        let response = initialResponse;
        let functionCalls = response.functionCalls;

        // Loop para lidar com chamadas de tool múltiplas/sequenciais
        while (functionCalls && functionCalls.length > 0) {
            const toolOutputs: Part[] = [];
            
            for (const call of functionCalls) {
                let resultMsg = "Feito.";
                const args = call.args as any;
                
                try {
                    if (call.name === "createTransaction") {
                        let cardId = undefined;
                        let method = args.paymentMethod || 'pix';
                        
                        if (method === 'credit_card' && cards.length > 0) {
                            if (args.cardKeyword) {
                                const found = cards.find(c => c.name.toLowerCase().includes(args.cardKeyword.toLowerCase()));
                                cardId = found?.id;
                            } 
                            if (!cardId) cardId = cards[0].id;
                        }

                        addTransaction({
                            name: args.name,
                            amount: args.amount,
                            type: args.type,
                            date: 'Hoje',
                            icon: args.categoryIcon || (args.type === 'expense' ? 'shopping_bag' : 'attach_money'),
                            color: args.type === 'expense' ? 'orange' : 'green',
                            paymentMethod: method,
                            cardId: cardId
                        });
                        
                        resultMsg = `Transação salva: ${args.name} - R$ ${args.amount}`;
                    } 
                    else if (call.name === "deleteTransaction") {
                        const target = transactions.find(t => t.name.toLowerCase().includes(args.keyword.toLowerCase()));
                        if (target) {
                            deleteTransaction(target.id);
                            resultMsg = `Transação removida: ${target.name}`;
                        } else {
                            resultMsg = `Não encontrei transação com nome "${args.keyword}".`;
                        }
                    }
                    else if (call.name === "createTask") {
                        const taskDate = args.date || new Date().toISOString().split('T')[0];
                        addTask({
                            title: args.title,
                            category: args.category || "Geral",
                            categoryIcon: args.categoryIcon || "check_circle",
                            time: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
                            date: taskDate,
                            completed: false
                        });
                        resultMsg = `Tarefa criada: ${args.title}`;
                    }
                    else if (call.name === "updateTask") {
                        const target = tasks.find(t => t.title.toLowerCase().includes(args.keyword.toLowerCase()));
                        if (target) {
                            if (args.action === 'delete') {
                                deleteTask(target.id);
                                resultMsg = `Tarefa apagada: ${target.title}`;
                            } else if (args.action === 'complete') {
                                updateTask({ ...target, completed: true });
                                resultMsg = `Tarefa concluída: ${target.title}`;
                            } else if (args.action === 'reschedule' && args.newDate) {
                                updateTask({ ...target, date: args.newDate });
                                resultMsg = `Tarefa reagendada: ${target.title} para ${args.newDate}`;
                            }
                        } else {
                            resultMsg = `Não encontrei a tarefa "${args.keyword}".`;
                        }
                    }
                } catch (err) {
                    console.error("Tool execution error:", err);
                    resultMsg = "Erro ao executar ação.";
                }

                addMessage('system', resultMsg, true);

                if (call.id) {
                    toolOutputs.push({
                        functionResponse: {
                            name: call.name,
                            response: { result: resultMsg },
                            id: call.id 
                        }
                    });
                }
            }

            if (toolOutputs.length > 0) {
                const nextResponse = await session.sendMessage({ message: toolOutputs });
                response = nextResponse;
                functionCalls = nextResponse.functionCalls;
            } else {
                break;
            }
        }

        if (response.text) {
            addMessage('model', response.text);
        }
    };

    const processMessage = async (text: string, imageBase64?: string | null) => {
        if (!text.trim() && !imageBase64) return;
        
        // Display user message
        addMessage('user', text, false, imageBase64 || undefined);
        setIsTyping(true);

        // Clear inputs immediately
        setChatInput('');
        setActiveAttachment(null); 

        try {
            if (!chatSessionRef.current) initChat();
            const session = chatSessionRef.current;
            
            if (session) {
                let messagePayload: any = [];
                
                // Add image if present
                if (imageBase64) {
                    // Remove data url prefix for API
                    const rawBase64 = imageBase64.split(',')[1];
                    messagePayload.push({
                        inlineData: {
                            mimeType: "image/jpeg", // Assuming jpeg/png mostly
                            data: rawBase64
                        }
                    });
                }

                // Add text
                if (text) {
                    messagePayload.push({ text: text });
                }

                let response = await session.sendMessage({ message: messagePayload });
                await handleModelResponse(session, response);
            } else {
                addMessage('system', "Erro: Chat não inicializado.");
            }

        } catch (error) {
            console.error("AI Error:", error);
            addMessage('system', "Tive um problema técnico.");
        } finally {
            setIsTyping(false);
        }
    };

    // --- FILE HANDLING ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setActiveAttachment(reader.result as string);
                setShowAttachments(false);
                // If selected via main bar, open chat immediately to show it
                if (!isChatOpen) {
                    setIsChatOpen(true);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMainBarSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!mainInput.trim() && !activeAttachment) return;
        setIsChatOpen(true);
        // Small delay to allow modal render
        setTimeout(() => {
            processMessage(mainInput, activeAttachment);
            setMainInput('');
        }, 100);
    };

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processMessage(chatInput, activeAttachment);
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white overflow-x-hidden min-h-screen flex flex-col relative w-full">
            
            {/* Hidden File Input for Attachments */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileSelect}
            />

            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>
            
            {isChatOpen && (
                <div className="fixed inset-0 z-[100] bg-background-dark/80 backdrop-blur-xl flex items-center justify-center sm:p-4 animate-fade-in-up">
                    <div className="w-full h-full sm:h-[85vh] sm:max-w-lg bg-[#151b26] sm:border border-white/10 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                        <div className="flex items-center justify-between px-4 py-4 bg-[#1a222e] border-b border-white/5 shrink-0 z-10">
                            <h3 className="font-semibold text-white">SyncLife AI</h3>
                            <button onClick={() => setIsChatOpen(false)} className="p-2 text-slate-400 hover:text-white">
                                <Icon name="close" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[#11161f]">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {msg.image && (
                                        <img src={msg.image} alt="Upload" className="max-w-[200px] rounded-xl mb-2 border border-white/10" />
                                    )}
                                    {msg.text && (
                                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-[#1e2736] text-slate-200'}`}>
                                            {msg.text}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isTyping && <div className="text-slate-500 text-xs ml-4">Digitando...</div>}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        {/* Chat Input Area */}
                        <div className="p-4 bg-[#1a222e] border-t border-white/5 shrink-0">
                            {/* Attachment Preview in Chat */}
                            {activeAttachment && (
                                <div className="flex items-center gap-2 mb-2 p-2 bg-white/5 rounded-lg w-fit">
                                    <img src={activeAttachment} className="w-10 h-10 rounded object-cover" />
                                    <span className="text-xs text-slate-300">Imagem anexada</span>
                                    <button onClick={() => setActiveAttachment(null)} className="p-1 hover:text-red-400"><Icon name="close" className="text-sm"/></button>
                                </div>
                            )}
                            <form onSubmit={handleChatSubmit} className="relative flex items-center gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="p-3 text-slate-400 hover:text-white bg-[#11161f] rounded-xl border border-white/10"
                                >
                                    <Icon name="add_photo_alternate" />
                                </button>
                                <input 
                                    ref={chatInputRef}
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 bg-[#11161f] border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm"
                                />
                                <button type="submit" disabled={(!chatInput.trim() && !activeAttachment) || isTyping} className="p-3 bg-primary text-white rounded-xl disabled:opacity-50">
                                    <Icon name="send" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <div className={`relative z-10 flex flex-col min-h-screen transition-all duration-300 ${isChatOpen ? 'scale-95 opacity-50 blur-[2px]' : 'opacity-100'}`}>
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24 w-full max-w-[960px] mx-auto">
                    <div className="w-full text-center mb-12 animate-fade-in-up">
                        <h1 className="text-4xl md:text-5xl font-light text-white mb-3 tracking-tight">
                            Olá, <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{userProfile.name}</span>
                        </h1>
                    </div>

                    <div className="w-full max-w-lg mb-8 relative z-20 animate-fade-in-up">
                        {/* Main Screen Attachment Menu */}
                        {showAttachments && (
                            <div className="absolute bottom-full left-0 mb-3 ml-2 flex flex-col gap-2 p-2 rounded-2xl bg-[#1a222e] border border-white/10 shadow-2xl animate-fade-in-up">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-slate-300"
                                >
                                    <Icon name="image" /> <span className="text-sm">Galeria</span>
                                </button>
                            </div>
                        )}
                        
                        <form onSubmit={handleMainBarSubmit} className="relative group">
                            {/* Main Bar Attachment Preview */}
                            {activeAttachment && !isChatOpen && (
                                <div className="absolute -top-16 left-0 flex items-center gap-2 p-2 bg-[#1a222e] border border-white/10 rounded-xl shadow-lg">
                                    <img src={activeAttachment} className="w-10 h-10 rounded object-cover" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400">Pronto para enviar</span>
                                        <span className="text-xs text-white font-bold">Imagem selecionada</span>
                                    </div>
                                    <button type="button" onClick={() => setActiveAttachment(null)} className="p-2 hover:text-red-400 ml-2"><Icon name="close" /></button>
                                </div>
                            )}
                            
                            <div className="relative flex items-center bg-[#1a222e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-lg">
                                <button type="button" onClick={() => setShowAttachments(!showAttachments)} className="p-3 text-slate-400 hover:text-white transition-colors">
                                    <Icon name={showAttachments ? "close" : "attach_file"} />
                                </button>
                                <input 
                                    type="text" 
                                    value={mainInput} 
                                    onChange={(e) => setMainInput(e.target.value)} 
                                    placeholder="Digite algo ou envie uma foto..." 
                                    className="flex-1 bg-transparent border-none outline-none text-white px-2 placeholder:text-slate-500" 
                                />
                                <button type="submit" className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                                    <Icon name="arrow_upward" />
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
                <FloatingNav />
            </div>
        </div>
    );
};

export default Home;