
import React, { useState } from 'react';
import FloatingNav from '../components/FloatingNav';
import Header from '../components/Header';
import Icon from '../components/Icon';
import ActionModal from '../components/ActionModal'; 
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';

const Finance: React.FC = () => {
    const { transactions, chartData, currentPeriod, setPeriod, deleteTransaction, cards, openModal, payCardInvoice, deleteCard } = useAppContext();
    const [view, setView] = useState<'General' | 'Cards'>('General');
    const [filter, setFilter] = useState<'Gastos' | 'Ganhos'>('Gastos');
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [isPaying, setIsPaying] = useState(false);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // --- REAL CALCULATIONS ---
    const cashIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const cashExpense = transactions.filter(t => t.type === 'expense' && t.paymentMethod !== 'credit_card').reduce((acc, t) => acc + t.amount, 0);
    const availableBalance = cashIncome - cashExpense;

    const displayedTransactions = transactions.filter(t => {
        if (view === 'Cards') {
            if (selectedCardId) return t.cardId === selectedCardId && !t.isPaid; 
            return t.paymentMethod === 'credit_card' && !t.isPaid;
        }
        return filter === 'Gastos' ? t.type === 'expense' : t.type === 'income';
    });

    const selectedCard = cards.find(c => c.id === selectedCardId);
    
    const getCardInvoice = (cardId: string) => {
        return transactions
            .filter(t => t.cardId === cardId && t.type === 'expense' && !t.isPaid)
            .reduce((acc, t) => acc + t.amount, 0);
    };

    const handlePayInvoice = async () => {
        if (!selectedCardId) return;
        if (window.confirm(`Deseja confirmar o pagamento da fatura de ${selectedCard?.name}?`)) {
            setIsPaying(true);
            try {
                await payCardInvoice(selectedCardId);
                alert("Fatura paga com sucesso!");
            } catch (e) {
                alert("Erro ao processar pagamento.");
            } finally {
                setIsPaying(false);
            }
        }
    };

    const handleDeleteCard = async () => {
        if (!selectedCardId) return;
        if (window.confirm(`Tem certeza que deseja excluir o cartão ${selectedCard?.name}? Isso não apagará o histórico de transações.`)) {
            await deleteCard(selectedCardId);
            setSelectedCardId(null);
        }
    };

    return (
        <div className="bg-background-dark text-white font-display antialiased selection:bg-primary/30 h-screen w-full flex flex-col overflow-hidden relative">
            <main className="flex-1 overflow-y-auto pb-32">
                <Header title="Minhas Finanças" />
                
                <div className="w-full max-w-[960px] mx-auto px-4 md:px-6 lg:px-8 pb-8 flex flex-col items-center">
                    
                    {/* Top Segmented Control */}
                    <div className="flex bg-[#1a222e] p-1 rounded-xl border border-white/5 mb-6 w-full max-w-sm">
                        <button 
                            onClick={() => { setView('General'); setSelectedCardId(null); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${view === 'General' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            Visão Geral
                        </button>
                        <button 
                            onClick={() => setView('Cards')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${view === 'Cards' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            Cartões
                        </button>
                    </div>

                    {view === 'General' ? (
                        <>
                            {/* Total Balance Card */}
                            <div className="w-full mb-8 animate-fade-in-up">
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a222e] to-[#242e3b] p-8 border border-white/5 shadow-xl">
                                    <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>
                                    <div className="relative z-10 flex flex-col gap-2">
                                        <span className="text-slate-400 text-sm font-medium tracking-wider uppercase">Saldo Disponível (Caixa)</span>
                                        <div className="flex items-baseline gap-4 flex-wrap">
                                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">{formatCurrency(availableBalance)}</h2>
                                        </div>
                                        <p className="text-slate-500 text-xs mt-1">Não inclui faturas de cartão em aberto.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Area */}
                            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                                <div className="lg:col-span-2 rounded-2xl bg-[#1a222e] p-6 border border-white/5 h-[300px] flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-slate-400 text-sm font-medium">Fluxo de Saída ({currentPeriod})</p>
                                        <div className="flex gap-2">
                                            {['1S', '1M', '1A'].map((p) => (
                                                <button key={p} onClick={() => setPeriod(p as any)} className={`px-2 py-1 text-[10px] rounded ${currentPeriod === p ? 'bg-primary text-white' : 'bg-white/5 text-slate-400'}`}>{p}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full min-h-0">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3484f4" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#3484f4" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <Area type="monotone" dataKey="value" stroke="#3484f4" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                                            </AreaChart>
                                         </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Mini Transaction List */}
                                <div className="lg:col-span-1 bg-[#1a222e] rounded-2xl border border-white/5 flex flex-col h-[300px] overflow-hidden">
                                    <div className="p-4 border-b border-white/5 flex justify-between">
                                        <h3 className="font-bold text-white text-sm">Últimas Transações</h3>
                                        <div className="flex bg-black/20 rounded p-0.5">
                                            <button onClick={() => setFilter('Gastos')} className={`px-2 py-0.5 text-[10px] rounded ${filter === 'Gastos' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Gastos</button>
                                            <button onClick={() => setFilter('Ganhos')} className={`px-2 py-0.5 text-[10px] rounded ${filter === 'Ganhos' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Ganhos</button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {displayedTransactions.slice(0, 10).map(t => (
                                            <div key={t.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${t.type === 'expense' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                                                        <Icon name={t.icon || 'attach_money'} className="text-lg" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-white">{t.name}</p>
                                                        <p className="text-[10px] text-slate-500">{t.date}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-bold ${t.type === 'expense' ? 'text-white' : 'text-[#0bda5e]'}`}>
                                                    {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        // CARDS VIEW
                        <div className="w-full animate-fade-in-up">
                            {/* Card List Horizontal Scroll */}
                            <div className="flex gap-4 overflow-x-auto pb-4 mb-6 scrollbar-hide snap-x">
                                <button 
                                    onClick={() => openModal('card')}
                                    className="min-w-[60px] h-[180px] rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-all text-slate-400 hover:text-white snap-start"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                        <Icon name="add" className="text-2xl" />
                                    </div>
                                    <span className="text-xs font-medium text-center leading-tight">Novo<br/>Cartão</span>
                                </button>

                                {cards.map(card => {
                                    const invoice = getCardInvoice(card.id);
                                    const available = card.limitAmount - invoice;
                                    const isSelected = selectedCardId === card.id;

                                    return (
                                        <div 
                                            key={card.id}
                                            onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                                            className={`relative min-w-[280px] h-[180px] rounded-2xl p-5 flex flex-col justify-between transition-all cursor-pointer snap-center shadow-lg hover:scale-105 border ${isSelected ? 'border-white ring-2 ring-primary/50' : 'border-transparent'}`}
                                            style={{ background: `linear-gradient(135deg, ${card.color.replace('from-', 'var(--tw-gradient-from) ').replace('to-', 'var(--tw-gradient-to) ')})` }} 
                                        >
                                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.color} opacity-90`}></div>
                                            
                                            <div className="relative z-10 flex justify-between items-start">
                                                <span className="font-bold text-white tracking-wider shadow-sm">{card.name}</span>
                                                <Icon name="contactless" className="text-white/80" />
                                            </div>
                                            
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-end mb-1">
                                                    <div>
                                                        <p className="text-[10px] text-white/70 uppercase">Fatura Atual</p>
                                                        <p className="text-xl font-bold text-white shadow-sm">{formatCurrency(invoice)}</p>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-black/30 h-1.5 rounded-full mb-2 overflow-hidden backdrop-blur-sm">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${available < 0 ? 'bg-red-400' : 'bg-white/90'}`}
                                                        style={{ width: `${Math.min((invoice / card.limitAmount) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-[10px] text-white/90 font-medium">
                                                    <span>Disp: {formatCurrency(available)}</span>
                                                    <span>Vence dia {card.dueDay}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Transactions for Selected Card */}
                            {selectedCardId && (
                                <div className="bg-[#1a222e] rounded-2xl border border-white/5 p-4 animate-fade-in-up relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-white">Fatura de {selectedCard?.name}</h3>
                                            <span className="text-xs text-slate-400">Fecha dia {selectedCard?.closingDay}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getCardInvoice(selectedCardId) > 0 && (
                                                <button 
                                                    onClick={handlePayInvoice}
                                                    disabled={isPaying}
                                                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                                                >
                                                    <Icon name={isPaying ? "hourglass_empty" : "payments"} className="text-sm" />
                                                    {isPaying ? "Pagando..." : "Pagar Fatura"}
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleDeleteCard}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                                            >
                                                <Icon name="delete" className="text-sm" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {displayedTransactions.length === 0 ? (
                                            <p className="text-sm text-slate-500 text-center py-4">Nenhum gasto pendente nesta fatura.</p>
                                        ) : (
                                            displayedTransactions.map(t => (
                                                <div key={t.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 border-b border-white/5 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-full bg-white/5 text-slate-300">
                                                            <Icon name={t.icon} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-white">{t.name}</p>
                                                            <p className="text-[10px] text-slate-500">{t.date}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white">{formatCurrency(t.amount)}</span>
                                                        <button onClick={() => deleteTransaction(t.id)} className="text-slate-600 hover:text-red-500"><Icon name="delete" className="text-sm" /></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {!selectedCardId && cards.length > 0 && (
                                <p className="text-center text-slate-500 text-sm mt-8">Selecione um cartão para ver os detalhes da fatura.</p>
                            )}
                        </div>
                    )}
                </div>
            </main>
            <FloatingNav />
        </div>
    );
};

export default Finance;
