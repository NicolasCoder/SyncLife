
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
    isAction?: boolean; // If true, styles as a system notification (e.g., "Transaction Saved")
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper for Base64 conversion
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
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

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Refs
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isChatOpen]);

    // Focus input when chat opens
    useEffect(() => {
        if (isChatOpen) {
            setTimeout(() => chatInputRef.current?.focus(), 100);
            
            // Only initialize if not already active to preserve history
            if (!chatSessionRef.current) {
                initChat();
            }
        } else {
            // Optional: Clear session when closed if we want "fresh" chat every time 
            // BUT the user requested history retention. 
            // Logic: "pra cada chat novo criado ele saiba o historico, mas depois que fehca,a ai se perde"
            // So we clear it when closing.
            chatSessionRef.current = null;
            setMessages([]);
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
                    
                    // Initialize chat if not exists (Voice command opens chat)
                    if (!chatSessionRef.current) initChat();
                    const session = chatSessionRef.current!;

                    // Send audio to Gemini
                    let response = await session.sendMessage({
                        message: [
                            {
                                inlineData: {
                                    mimeType: "audio/webm", // Browser standard
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
                    addMessage('system', "Erro ao processar áudio. Tente novamente.");
                } finally {
                    setIsTyping(false);
                    setPendingAudio(null); // Clear queue
                }
            }
        };

        handleVoiceCommand();
    }, [pendingAudio]);

    // --- TOOL DEFINITIONS ---
    const createTransactionTool: FunctionDeclaration = {
        name: "createTransaction",
        description: "Registrar uma nova transação financeira (gasto ou ganho). Se o usuário disser que usou cartão, defina paymentMethod como 'credit_card'.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "Nome breve (ex: Café, Uber)" },
                amount: { type: Type.NUMBER, description: "Valor numérico" },
                type: { type: Type.STRING, enum: ["expense", "income"], description: "Tipo" },
                paymentMethod: { type: Type.STRING, enum: ["pix", "credit_card", "cash"], description: "Meio de pagamento." },
                cardKeyword: { type: Type.STRING, description: "Nome do cartão se for crédito (ex: Nubank, Inter)." },
                categoryIcon: { type: Type.STRING, description: "Ícone Material Symbols sugerido pelo contexto (ex: restaurant, directions_car, shopping_bag, sports_soccer)." }
            },
            required: ["name", "amount", "type"]
        }
    };
    
    const deleteTransactionTool: FunctionDeclaration = {
        name: "deleteTransaction",
        description: "Remover uma transação existente pelo nome aproximado.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                keyword: { type: Type.STRING, description: "Nome ou palavra-chave para encontrar a transação." }
            },
            required: ["keyword"]
        }
    };

    const createTaskTool: FunctionDeclaration = {
        name: "createTask",
        description: "Criar uma nova tarefa. Deduza o ícone da categoria baseado no título.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Título da tarefa" },
                category: { type: Type.STRING, description: "Categoria (ex: Trabalho, Pessoal, Saúde)" },
                categoryIcon: { type: Type.STRING, description: "Ícone Material Symbols sugerido (ex: work, home, fitness_center)." },
                date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD exata." }
            },
            required: ["title"]
        }
    };

    const updateTaskTool: FunctionDeclaration = {
        name: "updateTask",
        description: "Atualizar status ou deletar uma tarefa existente.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                keyword: { type: Type.STRING, description: "Palavra-chave do título da tarefa" },
                action: { type: Type.STRING, enum: ["complete", "delete", "reschedule"], description: "Ação a tomar" },
                newDate: { type: Type.STRING, description: "Nova data YYYY-MM-DD se a ação for reschedule" }
            },
            required: ["keyword", "action"]
        }
    };

    // --- AI LOGIC ---

    const initChat = () => {
        const now = new Date();
        const fullDate = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const isoDate = now.toISOString().split('T')[0];
        const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Serialize current state for the AI (Limit to recent items to save tokens)
        const tasksSummary = tasks.slice(0, 15).map(t => `- [${t.completed ? 'X' : ' '}] ${t.title} (${t.date})`).join('\n');
        const transSummary = transactions.slice(0, 10).map(t => `- ${t.name}: R$${t.amount} (${t.type})`).join('\n');
        const cardsSummary = cards.map(c => `- ${c.name} (Final ${c.lastDigits})`).join('\n');

        chatSessionRef.current = ai.chats.create({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: `Você é a 'SyncLife Assistant', secretária pessoal eficiente e amigável.
                
                CONTEXTO TEMPORAL:
                - Hoje: ${fullDate} (${isoDate}). Hora: ${time}.

                DADOS DO USUÁRIO:
                CARTÕES DE CRÉDITO DISPONÍVEIS:
                ${cardsSummary || "Nenhum cartão cadastrado."}

                TAREFAS:
                ${tasksSummary}
                
                TRANSAÇÕES RECENTES:
                ${transSummary}

                REGRAS:
                1. MANTENHA O CONTEXTO: Se o usuário disser apenas um valor ou data, assuma que se refere à solicitação anterior.
                2. SEJA DIRETA: Responda de forma concisa.
                3. TOOLS: Use as ferramentas disponíveis para executar ações.
                `,
                tools: [{ functionDeclarations: [createTransactionTool, deleteTransactionTool, createTaskTool, updateTaskTool] }],
            }
        });
    };

    const addMessage = (role: 'user' | 'model' | 'system', text: string, isAction = false) => {
        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            role,
            text,
            isAction
        }]);
    };

    // Shared logic for tool handling loop
    const handleModelResponse = async (session: Chat, initialResponse: GenerateContentResponse) => {
        let response = initialResponse;
        let functionCalls = response.functionCalls;

        while (functionCalls && functionCalls.length > 0) {
            const toolOutputs: Part[] = [];
            
            for (const call of functionCalls) {
                let resultMsg = "Feito.";
                const args = call.args as any;
                
                try {
                    // --- TRANSACTION TOOLS ---
                    if (call.name === "createTransaction") {
                        // Find card ID if needed
                        let cardId = undefined;
                        let method = args.paymentMethod || 'pix';
                        
                        if (method === 'credit_card' && cards.length > 0) {
                            if (args.cardKeyword) {
                                const found = cards.find(c => c.name.toLowerCase().includes(args.cardKeyword.toLowerCase()));
                                cardId = found?.id;
                            } 
                            // Fallback to first card if not specified but credit requested
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
                        
                        const methodText = method === 'credit_card' ? ' (Cartão)' : '';
                        resultMsg = `Transação salva: ${args.name} - R$ ${args.amount}${methodText}`;
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

                    // --- TASK TOOLS ---
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
                // Return tool output to model so it knows the action was completed
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

    const processMessage = async (text: string) => {
        if (!text.trim()) return;

        addMessage('user', text);
        setIsTyping(true);

        try {
            // Ensure session exists
            if (!chatSessionRef.current) initChat();
            const session = chatSessionRef.current!;
            
            // Send text to existing session (preserving context)
            let response = await session.sendMessage({ message: text });
            await handleModelResponse(session, response);

        } catch (error) {
            console.error("AI Error:", error);
            addMessage('system', "Tive um problema técnico. Pode tentar de novo?");
        } finally {
            setIsTyping(false);
        }
    };

    // --- HANDLERS ---

    const openChatWithPrompt = (prompt: string) => {
        setIsChatOpen(true);
        // Slight delay to ensure useEffect initializes chat first if needed
        setTimeout(() => processMessage(prompt), 100);
    };

    const handleQuickAction = (item: string) => {
        const keyword = item.split(' ')[1];
        let prompt = "";
        if (keyword.includes('Café')) prompt = "Comprei um café, me ajuda a registrar?";
        else if (keyword.includes('Uber')) prompt = "Acabei de pegar um Uber.";
        else if (keyword.includes('Treino')) prompt = "Concluí meu treino de hoje.";
        else if (keyword.includes('Almoço')) prompt = "Almocei agora.";
        else prompt = `Quero registrar algo sobre ${keyword}`;
        
        openChatWithPrompt(prompt);
    };

    const handleMainBarSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!mainInput.trim()) return;
        setIsChatOpen(true);
        // Slight delay to ensure useEffect initializes chat first
        setTimeout(() => processMessage(mainInput), 100);
        setMainInput('');
    };

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processMessage(chatInput);
        setChatInput('');
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white overflow-x-hidden min-h-screen flex flex-col relative w-full">
            
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>
            
            {/* --- CHAT INTERFACE OVERLAY --- */}
            {isChatOpen && (
                <div className="fixed inset-0 z-[100] bg-background-dark/80 backdrop-blur-xl flex items-center justify-center sm:p-4 animate-fade-in-up">
                    <div className="w-full h-full sm:h-[85vh] sm:max-w-lg bg-[#151b26] sm:border border-white/10 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                        
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-4 py-4 bg-[#1a222e] border-b border-white/5 shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20">
                                    <Icon name="auto_awesome" className="text-white text-xl animate-pulse-slow" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white leading-tight">SyncLife AI</h3>
                                    <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Online
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsChatOpen(false)}
                                className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                            >
                                <Icon name="close" className="text-xl" />
                            </button>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[#11161f]">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.isAction ? (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium my-2">
                                            <Icon name="check_circle" className="text-sm" />
                                            {msg.text}
                                        </div>
                                    ) : (
                                        <div 
                                            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                msg.role === 'user' 
                                                ? 'bg-primary text-white rounded-tr-none' 
                                                : 'bg-[#1e2736] text-slate-200 border border-white/5 rounded-tl-none'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-[#1e2736] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[#1a222e] border-t border-white/5 shrink-0">
                            <form onSubmit={handleChatSubmit} className="relative flex items-center gap-2">
                                <button type="button" className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                                    <Icon name="mic" className="text-xl" />
                                </button>
                                <input 
                                    ref={chatInputRef}
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 bg-[#11161f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!chatInput.trim() || isTyping}
                                    className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none hover:bg-primary/90 transition-all"
                                >
                                    <Icon name="send" className="text-xl" />
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            )}

            {/* Main Content Wrapper */}
            <div className={`relative z-10 flex flex-col min-h-screen transition-all duration-300 ${isChatOpen ? 'scale-95 opacity-50 blur-[2px]' : 'opacity-100'}`}>
                <Header />

                {/* Central Content */}
                <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24 w-full max-w-[960px] mx-auto">
                    {/* Greeting Section */}
                    <div className="w-full text-center mb-12 animate-fade-in-up">
                        <h1 className="text-4xl md:text-5xl font-light text-white mb-3 tracking-tight">
                            Olá, <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{userProfile.name}</span>
                        </h1>
                        <p className="text-slate-400 text-lg font-light">Vamos sincronizar sua vida?</p>
                    </div>

                    {/* MAIN COMMAND BAR (Triggers Chat) */}
                    <div className="w-full max-w-lg mb-8 relative z-20 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                        {/* Attachment Menu Popup */}
                        {showAttachments && (
                            <div className="absolute bottom-full left-0 mb-3 ml-2 flex flex-col gap-2 p-2 rounded-2xl bg-[#1a222e] border border-white/10 shadow-2xl animate-fade-in-up origin-bottom-left">
                                {[
                                    { icon: 'description', label: 'Arquivo', color: 'text-blue-400' },
                                    { icon: 'image', label: 'Galeria', color: 'text-purple-400' },
                                    { icon: 'photo_camera', label: 'Câmera', color: 'text-orange-400' },
                                    { icon: 'location_on', label: 'Local', color: 'text-red-400' },
                                ].map((opt, idx) => (
                                    <button key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left group">
                                        <div className={`p-2 rounded-full bg-white/5 group-hover:bg-white/10 ${opt.color}`}>
                                            <Icon name={opt.icon} className="text-xl" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white pr-4">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleMainBarSubmit} className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative flex items-center bg-[#1a222e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-lg transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_30px_rgba(52,132,244,0.15)]">
                                
                                {/* Paperclip Toggle */}
                                <button 
                                    type="button"
                                    onClick={() => setShowAttachments(!showAttachments)}
                                    className={`p-3 rounded-xl transition-all ${showAttachments ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Icon name="attach_file" className={`text-xl transition-transform ${showAttachments ? 'rotate-45' : ''}`} />
                                </button>

                                <input 
                                    type="text" 
                                    value={mainInput}
                                    onChange={(e) => setMainInput(e.target.value)}
                                    placeholder="Digite uma nota, tarefa ou gasto..." 
                                    className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500 px-2 font-medium"
                                />

                                <button 
                                    type="submit"
                                    className={`p-3 rounded-xl transition-all ${mainInput.trim() ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
                                    disabled={!mainInput.trim()}
                                >
                                    <Icon name="arrow_upward" className="text-xl" />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Quick Suggestions (Chips) -> Triggers Chat */}
                    <div className="flex flex-wrap justify-center gap-3 w-full max-w-2xl px-4 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                        {['☕ Café', '🚗 Uber', '🏋️ Treino', '🥗 Almoço', '🛒 Mercado'].map((item, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleQuickAction(item)}
                                className="px-5 py-2.5 rounded-xl bg-[#223249]/40 hover:bg-[#223249] border border-white/5 hover:border-primary/30 text-slate-300 hover:text-white text-sm font-medium transition-all hover:scale-105"
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    {/* Voice Hint */}
                    <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                        <Icon name="mic" className="text-sm" />
                        <span>Segure o botão + para comandos de voz</span>
                    </div>

                </main>
                
                <FloatingNav />
            </div>
        </div>
    );
};

export default Home;
