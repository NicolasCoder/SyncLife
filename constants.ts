import { Transaction, Task, ChartDataPoint, Project } from './types';

// Helper to get today's date in YYYY-MM-DD
const getToday = () => new Date().toISOString().split('T')[0];
const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', icon: 'shopping_bag', color: 'blue', name: 'Supermercado', date: 'Ontem', amount: 450.00, type: 'expense' },
  { id: '2', icon: 'subscriptions', color: 'purple', name: 'Netflix', date: '02 Out', amount: 55.90, type: 'expense' },
  { id: '3', icon: 'payments', color: 'green', name: 'Salário', date: '01 Out', amount: 5000.00, type: 'income' },
  { id: '4', icon: 'restaurant', color: 'orange', name: 'Restaurante', date: '30 Set', amount: 120.00, type: 'expense' },
  { id: '5', icon: 'directions_car', color: 'cyan', name: 'Uber', date: '28 Set', amount: 24.90, type: 'expense' },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Redesign Site',
    logo: 'https://cdn-icons-png.flaticon.com/512/5968/5968267.png', 
    color: 'orange'
  },
  {
    id: 'p2',
    name: 'App Mobile',
    logo: 'https://cdn-icons-png.flaticon.com/512/732/732205.png', 
    color: 'blue'
  },
  {
    id: 'p3',
    name: 'Marketing',
    logo: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
    color: 'purple'
  },
  {
    id: 'p4',
    name: 'Financeiro',
    logo: 'https://cdn-icons-png.flaticon.com/512/2482/2482520.png',
    color: 'green'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    time: '10:00',
    date: getToday(),
    title: 'Revisar relatório financeiro',
    category: 'Gestão',
    categoryIcon: 'attach_money',
    priority: 1, // High
    completed: false,
    projectId: 'p4',
    tags: ['Contabilidade', 'Urgente'],
    logs: [
        { id: 'l1', text: 'Recebi os dados do banco', timestamp: '09:00' },
        { id: 'l2', text: 'Iniciei a análise de fluxo', timestamp: '09:30' }
    ]
  },
  {
    id: '2',
    time: '14:30',
    date: getToday(),
    title: 'Reunião de Design System',
    category: 'Design',
    categoryIcon: 'palette',
    completed: false,
    projectId: 'p1',
    priority: 2, // Medium
    subtasks: [
        { id: 's1', title: 'Preparar slides', completed: true },
        { id: 's2', title: 'Revisar componentes Figma', completed: false }
    ]
  },
  {
    id: '3',
    time: '18:00',
    date: getToday(),
    title: 'Campanha Instagram',
    category: 'Marketing',
    categoryIcon: 'campaign',
    completed: false,
    projectId: 'p3',
    priority: 3 // Low
  },
  {
    id: '4',
    time: '09:00',
    date: getTomorrow(),
    title: 'Deploy da API',
    category: 'Dev',
    categoryIcon: 'code',
    completed: false,
    projectId: 'p2',
    priority: 0 // None
  }
];

export const CHART_DATA: ChartDataPoint[] = [
  { name: 'Sem 1', value: 3000 },
  { name: 'Sem 2', value: 4500 },
  { name: 'Sem 3', value: 3200 },
  { name: 'Sem 4', value: 5100 },
];