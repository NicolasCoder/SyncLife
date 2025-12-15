
import React, { useMemo } from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
    const { tasks, cards, transactions, payCardInvoice } = useAppContext();

    const handlePay = async (cardId: string) => {
        if(window.confirm("Confirmar pagamento da fatura? Isso irá zerar o limite utilizado e marcar as transações como pagas.")) {
            await payCardInvoice(cardId);
        }
    }

    const notifications = useMemo(() => {
        const notifs = [];
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // 1. Task Deadlines
        tasks.forEach(t => {
            if (!t.completed && t.date) {
                if (t.date < today) {
                     notifs.push({ id: t.id, type: 'danger', icon: 'event_busy', title: 'Tarefa Atrasada', desc: `"${t.title}" venceu em ${t.date}.` });
                } else if (t.date === today) {
                     notifs.push({ id: t.id, type: 'warning', icon: 'event', title: 'Vence Hoje', desc: `"${t.title}" vence hoje.` });
                }
            }
        });

        // 2. Card Due Dates & Invoices
        const currentDay = new Date().getDate();
        cards.forEach(c => {
            // Check if there is an open invoice amount
            const invoiceAmount = transactions
                .filter(t => t.cardId === c.id && t.type === 'expense' && !t.isPaid)
                .reduce((acc, t) => acc + t.amount, 0);

            if (invoiceAmount > 0) {
                 const diff = c.dueDay - currentDay;
                 
                 // If due day is within next 3 days
                 if (diff >= 0 && diff <= 3) {
                     notifs.push({ 
                         id: c.id, 
                         type: 'info', 
                         icon: 'credit_card', 
                         title: 'Fatura Próxima', 
                         desc: `Fatura de R$ ${invoiceAmount} vence dia ${c.dueDay}.`,
                         action: 'pay'
                     });
                 }
                 // If Today
                 if (c.dueDay === currentDay) {
                      notifs.push({ 
                          id: c.id, 
                          type: 'danger', 
                          icon: 'payments', 
                          title: 'Fatura Vence Hoje', 
                          desc: `Pagar R$ ${invoiceAmount} do ${c.name} hoje!`,
                          action: 'pay'
                       });
                 }
                 // If Overdue (simple check assuming same month for prototype logic, 
                 // ideally we check month/year but let's assume dueDay < currentDay means overdue for current month cycle)
                 if (c.dueDay < currentDay) {
                      notifs.push({ 
                          id: c.id, 
                          type: 'danger', 
                          icon: 'warning', 
                          title: 'Fatura Atrasada?', 
                          desc: `Dia ${c.dueDay} já passou. Fatura de R$ ${invoiceAmount} em aberto.`,
                          action: 'pay'
                       });
                 }
            }
        });

        return notifs;
    }, [tasks, cards, transactions]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-end p-4 pointer-events-none">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto" onClick={onClose}></div>
            
            <div className="pointer-events-auto w-full max-w-sm bg-[#1a222e] border border-white/10 rounded-2xl shadow-2xl mt-16 overflow-hidden animate-fade-in-up">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#151b26]">
                    <h3 className="text-white font-semibold">Notificações</h3>
                    <div className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{notifications.length}</div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                            <Icon name="notifications_off" className="text-3xl mb-2 opacity-50" />
                            <p className="text-sm">Tudo tranquilo por aqui.</p>
                        </div>
                    ) : (
                        notifications.map((n, i) => (
                            <div key={i} className="flex flex-col gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                <div className="flex gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                        n.type === 'danger' ? 'bg-red-500/10 text-red-500' :
                                        n.type === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                                        'bg-blue-500/10 text-blue-500'
                                    }`}>
                                        <Icon name={n.icon} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-white">{n.title}</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
                                    </div>
                                </div>
                                {n.action === 'pay' && (
                                    <button 
                                        onClick={() => handlePay(n.id)}
                                        className="ml-12 mr-2 py-1.5 px-3 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Icon name="check" className="text-sm" />
                                        Pagar Fatura
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsModal;
