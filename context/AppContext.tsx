
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, Task, ChartDataPoint, Project, SubTask, TaskLog, CreditCard } from '../types';
import { supabase } from '../supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AppContextType {
  transactions: Transaction[];
  tasks: Task[];
  projects: Project[];
  cards: CreditCard[];
  
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  payCardInvoice: (cardId: string) => Promise<void>;
  
  addTask: (t: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  
  addProject: (p: Omit<Project, 'id'>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  addCard: (c: Omit<CreditCard, 'id'>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  chartData: ChartDataPoint[];
  setPeriod: (period: '1S' | '1M' | '1A') => void;
  currentPeriod: '1S' | '1M' | '1A';
  
  // User Profile
  userProfile: { name: string; avatar: string };
  updateUserProfile: (name: string, avatar: string) => Promise<void>;

  isModalOpen: boolean;
  modalType: 'transaction' | 'task' | 'project' | 'card';
  openModal: (type: 'transaction' | 'task' | 'project' | 'card') => void;
  closeModal: () => void;
  
  // Audio / Voice Command State
  pendingAudio: Blob | null;
  setPendingAudio: (audio: Blob | null) => void;

  // Auth State
  session: Session | null;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshData: () => Promise<void>; // Exposed for manual refresh
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Initial loading is true

  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  
  const [currentPeriod, setCurrentPeriod] = useState<'1S' | '1M' | '1A'>('1S');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  
  const [userProfile, setUserProfile] = useState({
    name: 'Visitante',
    avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png'
  });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'transaction' | 'task' | 'project' | 'card'>('transaction');

  const [pendingAudio, setPendingAudio] = useState<Blob | null>(null);

  // --- AUTH & INITIAL FETCH ---
  useEffect(() => {
    let mounted = true;

    // Safety Timeout: Force stop loading after 3 seconds if Supabase hangs
    const safetyTimer = setTimeout(() => {
        if (mounted && loading) {
            console.warn("Loading timed out - forcing app render");
            setLoading(false);
        }
    }, 3000);

    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.error("Erro ao verificar sessão:", error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      if (session) {
          loadUserProfile(session);
          fetchData(); // Calls setLoading(false) internally
      } else {
          setLoading(false);
      }
    }).catch(err => {
        if (!mounted) return;
        console.error("Erro crítico na inicialização do Auth:", err);
        setLoading(false);
    }).finally(() => {
        clearTimeout(safetyTimer);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session) {
          loadUserProfile(session);
          fetchData();
      } else {
          setTransactions([]);
          setTasks([]);
          setProjects([]);
          setCards([]);
          setLoading(false);
      }
    });

    return () => {
        mounted = false;
        clearTimeout(safetyTimer);
        subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = (session: Session) => {
      const { full_name, avatar_url } = session.user.user_metadata;
      setUserProfile({
          name: full_name || session.user.email?.split('@')[0] || 'Usuário',
          avatar: avatar_url || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'
      });
  };

  const fetchData = useCallback(async () => {
    try {
        const currentSession = (await supabase.auth.getSession()).data.session;
        if (!currentSession) {
            setLoading(false);
            return;
        }

        // Fetch Projects
        const { data: projData, error: projError } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (projError) console.error("Erro projects:", projError);
        if (projData) setProjects(projData);

        // Fetch Cards
        const { data: cardData, error: cardError } = await supabase.from('credit_cards').select('*').order('created_at', { ascending: false });
        if (cardError) console.error("Erro cards:", cardError);
        if (cardData) {
            setCards(cardData.map((c: any) => ({
                id: c.id,
                name: c.name,
                limitAmount: c.limit_amount,
                dueDay: c.due_day,
                closingDay: c.closing_day,
                color: c.color,
                lastDigits: c.last_digits
            })));
        }

        // Fetch Transactions
        const { data: transData, error: transError } = await supabase.from('transactions').select('*').order('date', { ascending: false });
        if (transError) console.error("Erro transactions:", transError);
        if (transData) {
            const mappedTrans = transData.map((t: any) => ({
                ...t,
                paymentMethod: t.payment_method,
                cardId: t.card_id,
                isPaid: t.is_paid || false
            }));
            setTransactions(mappedTrans);
        }

        // Fetch Tasks
        const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .select(`*, subtasks (*), task_logs (*)`)
            .order('created_at', { ascending: false });
        
        if (taskError) console.error("Erro tasks:", taskError);
        if (taskData) {
            const mappedTasks = taskData.map((t: any) => ({
                ...t,
                projectId: t.project_id,
                categoryIcon: t.category_icon,
                subtasks: t.subtasks || [],
                logs: t.task_logs || []
            }));
            setTasks(mappedTasks);
        }

    } catch (e) {
        console.error("Exceção ao carregar dados:", e);
    } finally {
        setLoading(false);
    }
  }, []);

  // --- CHART CALCULATION (REAL DATA) ---
  const calculateChartData = (data: Transaction[], period: '1S' | '1M' | '1A') => {
      // Grouping logic (simplified)
      const grouped: {[key: string]: number} = {};
      const now = new Date();
      
      data.forEach(t => {
          if (t.type !== 'expense') return; 
          
          const tDate = new Date(t.date);
          let key = '';

          if (period === '1S') {
             const diffTime = Math.abs(now.getTime() - tDate.getTime());
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             if (diffDays <= 7) {
                 key = tDate.toLocaleDateString('pt-BR', { weekday: 'short' });
             }
          } else if (period === '1M') {
             if (tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) {
                 const week = Math.ceil(tDate.getDate() / 7);
                 key = `Sem ${week}`;
             }
          } else {
             if (tDate.getFullYear() === now.getFullYear()) {
                 key = tDate.toLocaleDateString('pt-BR', { month: 'short' });
             }
          }

          if (key) {
              grouped[key] = (grouped[key] || 0) + Number(t.amount);
          }
      });

      const chart = Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
      if (chart.length === 0) {
          setChartData([{name: 'Sem dados', value: 0}]);
      } else {
          setChartData(chart.reverse()); 
      }
  };

  useEffect(() => {
      calculateChartData(transactions, currentPeriod);
  }, [transactions, currentPeriod]);


  // --- ACTIONS ---

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!session) return;
    
    const newTx = {
        user_id: session.user.id,
        name: t.name,
        amount: t.amount,
        type: t.type,
        date: t.date,
        icon: t.icon,
        color: t.color,
        payment_method: t.paymentMethod,
        card_id: t.cardId,
        is_paid: false
    };

    const { data } = await supabase.from('transactions').insert(newTx).select().single();
    if (data) {
        const mapped = { ...data, paymentMethod: data.payment_method, cardId: data.card_id, isPaid: false };
        setTransactions(prev => [mapped, ...prev]);
    }
  };

  const deleteTransaction = async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const payCardInvoice = async (cardId: string) => {
      if (!session) return;
      setTransactions(prev => prev.map(t => 
          (t.cardId === cardId && t.type === 'expense') 
          ? { ...t, isPaid: true } 
          : t
      ));
      await supabase.from('transactions').update({ is_paid: true }).eq('card_id', cardId).eq('type', 'expense');
  };

  const addProject = async (p: Omit<Project, 'id'>) => {
     if (!session) return;
     const newProj = { user_id: session.user.id, name: p.name, logo: p.logo, color: p.color };
     const { data } = await supabase.from('projects').insert(newProj).select().single();
     if (data) setProjects(prev => [data, ...prev]);
  };

  const deleteProject = async (id: string) => {
      setProjects(prev => prev.filter(p => p.id !== id));
      // Remove project association from tasks locally
      setTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
      await supabase.from('projects').delete().eq('id', id);
  };

  const addCard = async (c: Omit<CreditCard, 'id'>) => {
      if (!session) return;
      const newCard = {
          user_id: session.user.id,
          name: c.name,
          limit_amount: c.limitAmount,
          due_day: c.dueDay,
          closing_day: c.closingDay,
          color: c.color,
          last_digits: c.lastDigits
      };
      const { data } = await supabase.from('credit_cards').insert(newCard).select().single();
      if (data) {
          setCards(prev => [{
            id: data.id,
            name: data.name,
            limitAmount: data.limit_amount,
            dueDay: data.due_day,
            closingDay: data.closing_day,
            color: data.color,
            lastDigits: data.last_digits
          }, ...prev]);
      }
  };

  const deleteCard = async (id: string) => {
      setCards(prev => prev.filter(c => c.id !== id));
      // Remove card association from transactions locally if needed, but keeping history is safer.
      // We will let backend handle constraints or keep history.
      await supabase.from('credit_cards').delete().eq('id', id);
  };

  const addTask = async (t: Omit<Task, 'id'>) => {
     if (!session) return;
     const taskPayload = {
         user_id: session.user.id,
         title: t.title,
         category: t.category,
         category_icon: t.categoryIcon,
         time: t.time,
         date: t.date,
         completed: t.completed,
         priority: t.priority || 0,
         project_id: t.projectId || null,
         tags: t.tags || []
     };

     const { data: savedTask } = await supabase.from('tasks').insert(taskPayload).select().single();
     if (savedTask) {
         if (t.logs && t.logs.length > 0) {
             const logsPayload = t.logs.map(l => ({ task_id: savedTask.id, text: l.text, timestamp: l.timestamp }));
             await supabase.from('task_logs').insert(logsPayload);
         }
         fetchData(); 
     }
  };

  const updateTask = async (updatedTask: Task) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      await supabase.from('tasks').update({
          title: updatedTask.title,
          date: updatedTask.date,
          time: updatedTask.time,
          completed: updatedTask.completed,
          priority: updatedTask.priority,
          project_id: updatedTask.projectId,
          tags: updatedTask.tags
      }).eq('id', updatedTask.id);
  };
  
  const deleteTask = async (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('tasks').delete().eq('id', id);
  };

  const toggleTask = async (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (task) {
          const newStatus = !task.completed;
          setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));
          await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
      }
  };

  const signOut = async () => {
      await supabase.auth.signOut();
  };

  const updateUserProfile = async (name: string, avatar: string) => {
      if (!session) return;
      const { error } = await supabase.auth.updateUser({ data: { full_name: name, avatar_url: avatar } });
      if (!error) setUserProfile({ name, avatar });
  };

  const setPeriod = (p: '1S' | '1M' | '1A') => {
      setCurrentPeriod(p);
  };

  const openModal = (type: 'transaction' | 'task' | 'project' | 'card') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <AppContext.Provider value={{ 
      transactions, tasks, projects, cards,
      addTransaction, deleteTransaction, payCardInvoice,
      addTask, updateTask, deleteTask, toggleTask,
      addProject, deleteProject, 
      addCard, deleteCard,
      chartData, setPeriod, currentPeriod, 
      userProfile, updateUserProfile,
      isModalOpen, modalType, openModal, closeModal,
      pendingAudio, setPendingAudio,
      session, signOut, loading,
      refreshData: fetchData 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
