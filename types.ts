
export interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  icon: string;
  color: string;
  paymentMethod?: 'pix' | 'cash' | 'credit_card';
  cardId?: string;
  isPaid?: boolean; // True if credit card bill for this item is paid
}

export interface CreditCard {
  id: string;
  name: string;
  limitAmount: number;
  dueDay: number;
  closingDay: number;
  color: string;
  lastDigits: string;
}

export interface Project {
  id: string;
  name: string;
  logo: string; // URL, Emoji, or Base64
  color: string; // Background color for the logo container
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskLog {
  id: string;
  text: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  category: string;
  categoryIcon: string;
  time: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  priority?: number; // 0 = None, 1 = High, 2 = Medium, 3 = Low
  projectId?: string; // Link to a project
  tags?: string[];
  subtasks?: SubTask[];
  logs?: TaskLog[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
}
