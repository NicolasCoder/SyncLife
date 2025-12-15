
import React, { useState, useEffect } from 'react';
import FloatingNav from '../components/FloatingNav';
import Header from '../components/Header';
import Icon from '../components/Icon';
import TaskDetailModal from '../components/TaskDetailModal';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';

const Tasks: React.FC = () => {
    const { tasks, toggleTask, openModal, projects, deleteProject } = useAppContext();
    const [view, setView] = useState<'Dia' | 'Semana' | 'Mês' | 'Todos'>('Dia');
    const [groupByProject, setGroupByProject] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Sorting State
    const [sortBy, setSortBy] = useState<'time' | 'priority' | 'deadline'>('time');

    // Auto-enable group by project when switching to 'Todos' for better UX
    useEffect(() => {
        if (view === 'Todos') {
            setGroupByProject(true);
        }
    }, [view]);

    // Navigation Logic
    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (view === 'Dia') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (view === 'Semana') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (view === 'Mês') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setSelectedDate(newDate);
    };

    const formatDateStr = (date: Date) => date.toISOString().split('T')[0];
    const isSameDate = (d1: Date, d2: Date) => formatDateStr(d1) === formatDateStr(d2);

    // Helpers
    const getWeekDays = (baseDate: Date) => {
        const days = [];
        const current = new Date(baseDate);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
        const monday = new Date(current.setDate(diff));
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const getMonthDays = (baseDate: Date) => {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    // Filter Logic
    let filteredTasks = tasks.filter(t => {
        if (!t.date) return false;
        
        // If 'Todos' view, we skip date filtering
        if (view === 'Todos') return true;

        const tDate = new Date(t.date);
        if (view === 'Dia') return isSameDate(tDate, selectedDate);
        if (view === 'Semana') return isSameDate(tDate, selectedDate); 
        if (view === 'Mês') return isSameDate(tDate, selectedDate);
        return false;
    });

    // Sort Logic
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        
        // Construct comparable datetime values
        const dateA = a.date ? new Date(`${a.date}T${a.time || '00:00'}`).getTime() : 0;
        const dateB = b.date ? new Date(`${b.date}T${b.time || '00:00'}`).getTime() : 0;

        if (sortBy === 'priority') {
            const pA = a.priority && a.priority > 0 ? a.priority : 99;
            const pB = b.priority && b.priority > 0 ? b.priority : 99;
            if (pA === pB) {
                // Secondary sort by date
                return dateA - dateB;
            }
            return pA - pB;
        } 
        
        // Default / Deadline sort is by full Date+Time
        return dateA - dateB;
    });

    const groupedTasks = groupByProject 
        ? projects.map(p => ({
            project: p,
            tasks: filteredTasks.filter(t => t.projectId === p.id)
          })).filter(g => g.tasks.length > 0)
        : [{ project: null, tasks: filteredTasks }];
    
    if (groupByProject) {
        const orphanTasks = filteredTasks.filter(t => !t.projectId);
        if (orphanTasks.length > 0) groupedTasks.push({ project: null, tasks: orphanTasks });
    }

    const renderHeaderDate = () => {
        const options: Intl.DateTimeFormatOptions = view === 'Mês' 
            ? { month: 'long', year: 'numeric' } 
            : { day: 'numeric', month: 'long' };
        return selectedDate.toLocaleDateString('pt-BR', options);
    };

    const getPriorityColor = (p?: number) => {
        if (p === 1) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
        if (p === 2) return 'bg-orange-500';
        if (p === 3) return 'bg-blue-400';
        return 'bg-slate-700/50';
    };

    const getPriorityLabel = (p?: number) => {
        if (p === 1) return 'Prioridade Alta';
        if (p === 2) return 'Prioridade Média';
        if (p === 3) return 'Prioridade Baixa';
        return '';
    };

    const handleDeleteProject = async (id: string, name: string) => {
        if(window.confirm(`Excluir projeto "${name}"? As tarefas perderão o vínculo com o projeto.`)) {
            await deleteProject(id);
        }
    }

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-white overflow-hidden flex flex-col w-full h-full">
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full max-w-[960px] mx-auto">
                <Header title="Minhas Tarefas" />

                <div className="flex-none px-6 pb-2 z-20">
                    <div className="flex justify-between items-center mb-6">
                         <div className="bg-surface-dark p-1 rounded-xl flex items-center border border-white/5 shadow-inner overflow-x-auto scrollbar-hide max-w-[220px] sm:max-w-none">
                            {['Dia', 'Semana', 'Mês', 'Todos'].map(v => (
                                <button 
                                    key={v}
                                    onClick={() => setView(v as any)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${view === v ? 'bg-surface-highlight text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setGroupByProject(!groupByProject)}
                                className={`p-2 rounded-lg border transition-all ${groupByProject ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-dark border-white/5 text-slate-400'}`}
                                title="Agrupar por Projeto"
                            >
                                <Icon name="folder_open" className="text-xl" />
                            </button>
                             <button 
                                onClick={() => openModal('project')}
                                className="p-2 rounded-lg bg-surface-dark border border-white/5 text-slate-400 hover:text-white transition-all"
                                title="Novo Projeto"
                            >
                                <Icon name="create_new_folder" className="text-xl" />
                            </button>
                        </div>
                    </div>

                    {/* Sort Chips */}
                     <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide mb-2">
                        <button 
                            onClick={() => setSortBy('priority')}
                            className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-medium whitespace-nowrap transition-colors ${sortBy === 'priority' ? 'bg-red-500/20 text-red-400 border-red-500/20' : 'bg-surface-dark text-slate-400 border-white/5 hover:bg-surface-highlight'}`}
                        >
                            <Icon name="flag" className="text-sm" filled={sortBy === 'priority'} />
                            Prioridade
                        </button>
                        <button 
                             onClick={() => setSortBy('deadline')}
                             className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-medium whitespace-nowrap transition-colors ${sortBy === 'deadline' ? 'bg-primary/20 text-primary border-primary/20' : 'bg-surface-dark text-slate-400 border-white/5 hover:bg-surface-highlight'}`}
                        >
                            <Icon name="schedule" className="text-sm" />
                            Prazo
                        </button>
                        <button 
                            onClick={() => openModal('task')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark text-slate-300 border border-white/5 rounded-full text-xs font-medium whitespace-nowrap hover:bg-surface-highlight transition-colors ml-auto"
                        >
                            <Icon name="add" className="text-sm" />
                            Nova Tarefa
                        </button>
                    </div>
                </div>

                {/* Date Navigation - Only show if NOT in 'Todos' view */}
                {view !== 'Todos' && (
                    <div className="flex-none bg-background-light dark:bg-background-dark z-10 border-b border-white/5 pb-4">
                        <div className="px-6 py-2 flex items-center justify-between mb-2">
                            <button onClick={() => navigateDate('prev')} className="p-2 rounded-full hover:bg-surface-highlight text-slate-400 hover:text-white transition-colors">
                                <Icon name="chevron_left" />
                            </button>
                            <div className="text-center">
                                <h2 className="text-white font-semibold text-lg capitalize">{renderHeaderDate()}</h2>
                                {view === 'Semana' && <p className="text-slate-400 text-xs">Semana Atual</p>}
                            </div>
                            <button onClick={() => navigateDate('next')} className="p-2 rounded-full hover:bg-surface-highlight text-slate-400 hover:text-white transition-colors">
                                <Icon name="chevron_right" />
                            </button>
                        </div>

                        {/* Week Grid */}
                        {view === 'Semana' && (
                            <div className="flex justify-between px-4 pb-2">
                                {getWeekDays(selectedDate).map((day, idx) => {
                                    const isSelected = isSameDate(day, selectedDate);
                                    const hasTask = tasks.some(t => t.date && isSameDate(new Date(t.date), day));
                                    return (
                                        <button 
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            className={`flex flex-col items-center p-2 rounded-xl min-w-[45px] transition-all ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'hover:bg-white/5 text-slate-400'}`}
                                        >
                                            <span className="text-[10px] uppercase font-bold mb-1 opacity-70">
                                                {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                            </span>
                                            <span className={`text-sm font-semibold ${isSelected ? 'scale-110' : ''}`}>{day.getDate()}</span>
                                            {hasTask && !isSelected && <div className="w-1 h-1 bg-primary rounded-full mt-1"></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Month Grid */}
                        {view === 'Mês' && (
                            <div className="grid grid-cols-7 gap-1 px-4 text-center">
                                {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-[10px] text-slate-500 py-1">{d}</span>)}
                                {getMonthDays(selectedDate).map((day, idx) => {
                                    const isSelected = isSameDate(day, selectedDate);
                                    const hasTask = tasks.some(t => t.date && isSameDate(new Date(t.date), day));
                                    return (
                                        <button 
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center text-xs relative ${isSelected ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/5'}`}
                                        >
                                            {day.getDate()}
                                            {hasTask && !isSelected && <div className="absolute bottom-0.5 w-1 h-1 bg-primary rounded-full"></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Task List */}
                <main className="flex-1 overflow-y-auto px-4 pb-32 pt-4 space-y-4">
                    {filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 opacity-60">
                            <Icon name="event_busy" className="text-4xl mb-2" />
                            <p className="text-sm">Nenhuma tarefa.</p>
                        </div>
                    ) : (
                        groupedTasks.map((group, groupIdx) => (
                            <div key={groupIdx} className="animate-fade-in-up" style={{animationDelay: `${groupIdx * 0.1}s`}}>
                                {/* Project Header */}
                                {groupByProject && (
                                    <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
                                        {group.project ? (
                                            <>
                                                <div className="size-6 rounded-full p-1 bg-white/5 flex items-center justify-center">
                                                    <img src={group.project.logo} className="w-full h-full object-contain opacity-80" />
                                                </div>
                                                <h3 className="text-white font-semibold text-sm">{group.project.name}</h3>
                                                <button 
                                                    onClick={() => handleDeleteProject(group.project.id, group.project.name)}
                                                    className="ml-auto text-slate-500 hover:text-red-500 p-1"
                                                >
                                                    <Icon name="delete" className="text-sm" />
                                                </button>
                                            </>
                                        ) : (
                                            <h3 className="text-slate-400 font-semibold text-sm ml-1">Sem Projeto</h3>
                                        )}
                                        <div className="h-[1px] flex-1 bg-white/5 ml-2"></div>
                                    </div>
                                )}

                                {/* Tasks */}
                                <div className="space-y-3">
                                    {group.tasks.map((task) => {
                                        const project = !groupByProject && task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                        
                                        // Show date in task card if looking at 'Todos' view, since tasks can be from any day
                                        const showDateLabel = view === 'Todos';
                                        
                                        return (
                                            <div key={task.id} className={`group flex gap-4 items-start transition-all duration-300 ${task.completed ? 'opacity-50' : ''}`}>
                                                <div className="flex flex-col items-center pt-1 min-w-[50px]">
                                                    <span className={`text-xs font-semibold mb-1 ${task.completed ? 'text-slate-600' : 'text-slate-400'}`}>
                                                        {task.time}
                                                    </span>
                                                    <div className={`w-3 h-3 rounded-full z-10 ${task.completed ? 'bg-green-500' : getPriorityColor(task.priority)}`}></div>
                                                    <div className="w-0.5 bg-gradient-to-b from-surface-highlight to-transparent h-full mt-[-6px] rounded-full"></div>
                                                </div>
                                                
                                                <div 
                                                    onClick={() => setSelectedTask(task)}
                                                    className={`flex-1 p-4 rounded-xl transition-colors cursor-pointer border relative overflow-hidden ${task.completed ? 'bg-surface-dark/30 border-white/5' : 'glass-panel hover:bg-surface-highlight/50 hover:border-primary/20'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className={`font-medium text-base leading-tight ${task.completed ? 'text-slate-500 line-through' : 'text-white'}`}>{task.title}</h3>
                                                                {showDateLabel && task.date && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-medium">
                                                                        {new Date(task.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            <p className="text-slate-400 text-sm flex items-center gap-1">
                                                                <Icon name={task.categoryIcon} className="text-sm" />
                                                                {task.category}
                                                                {task.priority && !task.completed && task.priority > 0 && (
                                                                    <span className={`text-xs font-bold ml-1 ${task.priority === 1 ? 'text-red-400' : task.priority === 2 ? 'text-orange-400' : 'text-blue-400'}`}>
                                                                        • {getPriorityLabel(task.priority)}
                                                                    </span>
                                                                )}
                                                            </p>

                                                            {/* Display Subtasks Outside */}
                                                            {task.subtasks && task.subtasks.length > 0 && (
                                                                <div className="mt-3 space-y-1">
                                                                    {task.subtasks.slice(0, 3).map(sub => (
                                                                        <div key={sub.id} className="flex items-center gap-2 text-xs text-slate-400">
                                                                            <div className={`w-3 h-3 rounded-full border border-slate-600 flex items-center justify-center ${sub.completed ? 'bg-green-500/50 border-transparent' : ''}`}>
                                                                                {sub.completed && <Icon name="check" className="text-[8px] text-white" />}
                                                                            </div>
                                                                            <span className={sub.completed ? 'line-through opacity-60' : ''}>{sub.title}</span>
                                                                        </div>
                                                                    ))}
                                                                    {task.subtasks.length > 3 && (
                                                                        <span className="text-[10px] text-primary block pt-1">+ {task.subtasks.length - 3} subtarefas</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTask(task.id);
                                                            }}
                                                            className={`size-6 rounded-full border-2 flex items-center justify-center transition-all z-10 ${task.completed ? 'bg-primary/20 border-primary text-primary' : 'border-slate-600 hover:border-primary hover:bg-primary/20'}`}
                                                        >
                                                            <Icon name="check" className={`text-sm font-bold ${task.completed ? 'text-primary' : 'text-transparent'}`} />
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Footer: Tags & Project */}
                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                                                        {project ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className={`size-5 rounded-full bg-white/10 p-1 flex items-center justify-center`}>
                                                                    <img src={project.logo} alt={project.name} className="w-full h-full object-contain" />
                                                                </div>
                                                                <span className="text-xs font-medium text-slate-300">{project.name}</span>
                                                            </div>
                                                        ) : <div></div>}

                                                        {task.tags && task.tags.length > 0 && (
                                                            <div className="flex gap-1">
                                                                {task.tags.map(tag => (
                                                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-400">#{tag}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </main>
                
                <FloatingNav />
                <TaskDetailModal 
                    task={selectedTask} 
                    isOpen={!!selectedTask} 
                    onClose={() => setSelectedTask(null)} 
                />
            </div>
        </div>
    );
};

export default Tasks;
