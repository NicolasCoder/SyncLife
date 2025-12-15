
import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'transaction' | 'task' | 'project' | 'card';
}

const ActionModal: React.FC<ActionModalProps> = ({ isOpen, onClose, type = 'transaction' }) => {
  const { addTransaction, addTask, addProject, addCard, projects, cards } = useAppContext();
  const [activeTab, setActiveTab] = useState<'transaction' | 'task' | 'project' | 'card'>(type);
  
  // Refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setActiveTab(type);
  }, [type, isOpen]);

  // Transaction State
  const [amount, setAmount] = useState('');
  const [tName, setTName] = useState('');
  const [tType, setTType] = useState<'income' | 'expense'>('expense');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [selectedCardId, setSelectedCardId] = useState('');

  // Task State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('12:00');
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskCategory, setTaskCategory] = useState('Trabalho');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Project State
  const [projName, setProjName] = useState('');
  const [projColor, setProjColor] = useState('blue');
  const [projLogo, setProjLogo] = useState('https://cdn-icons-png.flaticon.com/512/1006/1006771.png');

  // Card State
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardCurrency, setCardCurrency] = useState<'BRL' | 'USD'>('BRL');
  const [cardDueDay, setCardDueDay] = useState('');
  const [cardClosingDay, setCardClosingDay] = useState('');
  const [cardColor, setCardColor] = useState('from-purple-600 to-indigo-600');
  const [cardLastDigits, setCardLastDigits] = useState('');

  // Reset fields
  useEffect(() => {
    if(!isOpen) {
        setAmount(''); setTName(''); setPaymentMethod('pix'); setSelectedCardId('');
        setTaskTitle(''); setTaskTime('12:00'); setSelectedProjectId('');
        setProjName(''); setProjColor('blue');
        setCardName(''); setCardLimit(''); setCardDueDay('');
    }
  }, [isOpen]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProjLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'transaction') {
      if (!amount || !tName) return;
      addTransaction({
        name: tName,
        amount: parseFloat(amount),
        type: tType,
        date: 'Hoje',
        icon: tType === 'expense' ? 'shopping_bag' : 'attach_money',
        color: tType === 'expense' ? 'orange' : 'green',
        paymentMethod: tType === 'expense' ? paymentMethod : 'pix',
        cardId: paymentMethod === 'credit_card' ? selectedCardId : undefined
      });
    } else if (activeTab === 'task') {
      if (!taskTitle) return;
      addTask({
        title: taskTitle,
        time: taskTime,
        date: taskDate,
        category: taskCategory,
        categoryIcon: 'label',
        completed: false,
        projectId: selectedProjectId || undefined,
        logs: [{ id: Math.random().toString(), text: 'Tarefa criada', timestamp: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) }]
      });
    } else if (activeTab === 'project') {
        if (!projName) return;
        addProject({ name: projName, color: projColor, logo: projLogo });
    } else if (activeTab === 'card') {
        if (!cardName) return;
        addCard({
            name: cardName,
            limitAmount: parseFloat(cardLimit || '0'),
            dueDay: parseInt(cardDueDay),
            closingDay: parseInt(cardClosingDay),
            color: cardColor,
            lastDigits: cardLastDigits
        });
    }
    
    onClose();
  };

  const CARD_GRADIENTS = [
      { label: 'Roxo (Nubank)', val: 'from-[#820ad1] to-[#400080]' },
      { label: 'Laranja (Inter)', val: 'from-[#ff7a00] to-[#ff5200]' },
      { label: 'Preto (Black)', val: 'from-gray-800 to-black' },
      { label: 'Azul (Itaú)', val: 'from-blue-600 to-blue-900' },
      { label: 'Vermelho (Santander)', val: 'from-red-600 to-red-800' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-[#1a222e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header/Tabs */}
        <div className="flex border-b border-white/5 overflow-x-auto scrollbar-hide">
            {['transaction', 'task', 'project', 'card'].map(tab => (
                 <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-4 px-2 text-sm font-medium transition-colors whitespace-nowrap capitalize ${activeTab === tab ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    {tab === 'transaction' ? 'Transação' : tab === 'task' ? 'Tarefa' : tab === 'project' ? 'Projeto' : 'Cartão'}
                </button>
            ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {activeTab === 'transaction' && (
            <div className="space-y-4">
               <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tipo</label>
                <div className="flex bg-[#111722] rounded-lg p-1 border border-white/5">
                   <button type="button" onClick={() => setTType('expense')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tType === 'expense' ? 'bg-[#fa6238] text-white shadow' : 'text-slate-400'}`}>Gasto</button>
                   <button type="button" onClick={() => setTType('income')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tType === 'income' ? 'bg-[#0bda5e] text-white shadow' : 'text-slate-400'}`}>Ganho</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Descrição & Valor</label>
                <div className="flex gap-2">
                    <input 
                    type="text" 
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    placeholder="Ex: Almoço" 
                    className="flex-[2] bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none"
                    autoFocus
                    />
                    <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="R$ 0,00" 
                    className="flex-1 min-w-[100px] bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
              </div>

              {tType === 'expense' && (
                  <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Método de Pagamento</label>
                      <div className="flex gap-2 mb-3">
                          <button 
                            type="button" 
                            onClick={() => setPaymentMethod('pix')}
                            className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${paymentMethod === 'pix' ? 'bg-white text-black border-white' : 'border-white/10 text-slate-400'}`}
                          >
                              Pix / Dinheiro
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setPaymentMethod('credit_card')}
                            className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${paymentMethod === 'credit_card' ? 'bg-white text-black border-white' : 'border-white/10 text-slate-400'}`}
                          >
                              Cartão de Crédito
                          </button>
                      </div>

                      {paymentMethod === 'credit_card' && (
                          <div className="grid grid-cols-2 gap-2">
                              {cards.map(card => (
                                  <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => setSelectedCardId(card.id)}
                                    className={`p-2 rounded-xl border text-left transition-all ${selectedCardId === card.id ? 'bg-primary/20 border-primary' : 'bg-[#111722] border-white/10 opacity-70 hover:opacity-100'}`}
                                  >
                                      <div className={`w-full h-10 rounded-lg bg-gradient-to-r ${card.color} mb-1`}></div>
                                      <span className="text-[10px] text-white block truncate">{card.name}</span>
                                  </button>
                              ))}
                              {cards.length === 0 && (
                                  <p className="col-span-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">Nenhum cartão cadastrado. Adicione um na aba "Cartão".</p>
                              )}
                          </div>
                      )}
                  </div>
              )}
            </div>
          )}

          {activeTab === 'card' && (
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Cartão</label>
                    <input 
                        type="text" 
                        value={cardName} 
                        onChange={e => setCardName(e.target.value)} 
                        placeholder="Ex: Nubank Platinum"
                        className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                    />
                </div>
                <div className="flex gap-3">
                     <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Limite</label>
                        <div className="flex bg-[#111722] border border-white/10 rounded-xl overflow-hidden focus-within:border-primary">
                            <select 
                                value={cardCurrency}
                                onChange={(e) => setCardCurrency(e.target.value as 'BRL' | 'USD')}
                                className="bg-white/5 text-slate-300 text-xs font-bold px-2 border-r border-white/10 outline-none"
                            >
                                <option value="BRL">R$</option>
                                <option value="USD">US$</option>
                            </select>
                            <input 
                                type="number" 
                                value={cardLimit} 
                                onChange={e => setCardLimit(e.target.value)} 
                                placeholder="0.00"
                                className="w-full bg-transparent border-none px-3 py-3 text-white outline-none" 
                            />
                        </div>
                     </div>
                     <div className="w-24">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Final 4</label>
                        <input type="text" maxLength={4} value={cardLastDigits} onChange={e => setCardLastDigits(e.target.value)} placeholder="1234" className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" />
                     </div>
                </div>
                <div className="flex gap-3">
                     <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Dia Fechamento</label>
                        <input type="number" max={31} value={cardClosingDay} onChange={e => setCardClosingDay(e.target.value)} className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" />
                     </div>
                     <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Dia Vencimento</label>
                        <input type="number" max={31} value={cardDueDay} onChange={e => setCardDueDay(e.target.value)} className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" />
                     </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Cor do Cartão</label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {CARD_GRADIENTS.map((g, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setCardColor(g.val)}
                                className={`w-8 h-8 rounded-full bg-gradient-to-br ${g.val} ring-2 ring-offset-2 ring-offset-[#1a222e] transition-all ${cardColor === g.val ? 'ring-white scale-110' : 'ring-transparent opacity-70'}`}
                                title={g.label}
                            />
                        ))}
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'task' && (
             <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Título</label>
                <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
                <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
              </div>
            </div>
          )}

          {activeTab === 'project' && (
            <div className="space-y-4">
                <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Projeto</label>
                <input type="text" value={projName} onChange={(e) => setProjName(e.target.value)} className="w-full bg-[#111722] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" />
                </div>
                
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Ícone / Logo</label>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors overflow-hidden relative group"
                            onClick={() => logoInputRef.current?.click()}
                        >
                            <img src={projLogo} alt="Logo" className="w-8 h-8 object-contain opacity-80 group-hover:opacity-100" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icon name="upload" className="text-white text-xs" />
                            </div>
                        </div>
                        <span className="text-xs text-slate-500">Clique para alterar a imagem</span>
                        
                        <input 
                            type="file" 
                            ref={logoInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 font-medium hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionModal;
