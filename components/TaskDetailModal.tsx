import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import { Task, SubTask } from '../types';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose }) => {
  const { updateTask, projects } = useAppContext();
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newLogText, setNewLogText] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // Tag state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  useEffect(() => {
    if (task) {
        setEditedTask(JSON.parse(JSON.stringify(task))); // Deep copy
    }
  }, [task, isOpen]);

  if (!isOpen || !editedTask) return null;

  const handleUpdate = (updates: Partial<Task>) => {
      if (!editedTask) return;
      const updated = { ...editedTask, ...updates };
      setEditedTask(updated);
      updateTask(updated);
  };

  const addLog = () => {
      if (!newLogText.trim()) return;
      const newLog = {
          id: Math.random().toString(),
          text: newLogText,
          timestamp: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
      };
      const updatedLogs = [newLog, ...(editedTask.logs || [])];
      handleUpdate({ logs: updatedLogs });
      setNewLogText('');
  };

  const addSubtask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSubtaskText.trim()) return;
      const newSub = {
          id: Math.random().toString(),
          title: newSubtaskText,
          completed: false
      };
      const updatedSubs = [...(editedTask.subtasks || []), newSub];
      handleUpdate({ subtasks: updatedSubs });
      setNewSubtaskText('');
  };

  const toggleSubtask = (id: string) => {
      const updatedSubs = editedTask.subtasks?.map(s => 
          s.id === id ? { ...s, completed: !s.completed } : s
      );
      handleUpdate({ subtasks: updatedSubs });
  };

  const cyclePriority = () => {
      // 0 (None) -> 3 (Low) -> 2 (Medium) -> 1 (High) -> 0
      const current = editedTask.priority || 0;
      let next = 0;
      if (current === 0) next = 3;
      else if (current === 3) next = 2;
      else if (current === 2) next = 1;
      else if (current === 1) next = 0;
      
      handleUpdate({ priority: next });
  };

  const getPriorityColor = (p?: number) => {
      if (p === 1) return 'text-red-500 bg-red-500/10';
      if (p === 2) return 'text-orange-500 bg-orange-500/10';
      if (p === 3) return 'text-blue-500 bg-blue-500/10';
      return 'text-slate-500 hover:text-slate-300';
  };

  const getPriorityLabel = (p?: number) => {
      if (p === 1) return 'Prioridade Alta';
      if (p === 2) return 'Prioridade Média';
      if (p === 3) return 'Prioridade Baixa';
      return 'Sem Prioridade';
  };

  const handleAddTag = () => {
      if (newTagText.trim()) {
          handleUpdate({ tags: [...(editedTask.tags || []), newTagText.trim()] });
          setNewTagText('');
          setIsAddingTag(false);
      } else {
          setIsAddingTag(false);
      }
  };

  const currentProject = projects.find(p => p.id === editedTask.projectId);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose}></div>
      
      <div className="pointer-events-auto w-full max-w-lg bg-[#1a222e] border-t sm:border border-white/10 sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#151b26]">
            <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5">
                <Icon name="expand_more" className="text-2xl" />
            </button>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={cyclePriority}
                    className={`p-2 rounded-full transition-colors flex items-center gap-2 px-3 ${getPriorityColor(editedTask.priority)}`}
                    title={getPriorityLabel(editedTask.priority)}
                 >
                    <Icon name="flag" className="text-xl" filled={!!editedTask.priority} />
                    {editedTask.priority ? <span className="text-xs font-bold">{editedTask.priority}</span> : null}
                 </button>
                 <button className="p-2 text-slate-500 hover:text-red-500 rounded-full hover:bg-white/5">
                    <Icon name="delete" className="text-xl" />
                 </button>
            </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
            
            {/* Title & Project */}
            <div>
                <input 
                    type="text" 
                    value={editedTask.title}
                    onChange={(e) => handleUpdate({ title: e.target.value })}
                    className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-slate-600 outline-none mb-3"
                />
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Project Dropdown */}
                    <div className="relative group">
                         <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium text-slate-300 transition-colors">
                            {currentProject ? (
                                <>
                                    <img src={currentProject.logo} className="w-4 h-4 object-contain" />
                                    {currentProject.name}
                                </>
                            ) : (
                                <>
                                    <Icon name="folder_open" className="text-sm" />
                                    Selecionar Projeto
                                </>
                            )}
                         </button>
                         <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a222e] border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-50">
                             {projects.map(p => (
                                 <button 
                                    key={p.id}
                                    onClick={() => handleUpdate({ projectId: p.id })}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-xs text-slate-300 hover:bg-white/5"
                                 >
                                     <img src={p.logo} className="w-4 h-4 object-contain" />
                                     {p.name}
                                 </button>
                             ))}
                             <button 
                                onClick={() => handleUpdate({ projectId: undefined })}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-xs text-slate-400 hover:bg-white/5 border-t border-white/5"
                             >
                                 <Icon name="block" className="text-sm" />
                                 Sem Projeto
                             </button>
                         </div>
                    </div>

                    {/* Date Picker - Styled clean */}
                    <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors cursor-pointer group">
                        <Icon name="calendar_today" className="text-sm pointer-events-none group-hover:text-white" />
                        {/* We use a transparent input on top or stylize it */}
                        <input 
                            type="date" 
                            value={editedTask.date}
                            onChange={(e) => handleUpdate({ date: e.target.value })}
                            className="bg-transparent outline-none border-none p-0 text-slate-300 w-[110px] cursor-pointer text-xs focus:ring-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
                        />
                        {/* Custom chevron to imply action */}
                         <Icon name="arrow_drop_down" className="text-sm ml-[-20px] pointer-events-none text-slate-500" />
                    </div>
                </div>
            </div>

            {/* Tags Input */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2 items-center">
                    {editedTask.tags?.map((tag, i) => (
                        <span key={i} className="group relative px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 flex items-center gap-1">
                            #{tag}
                            <button 
                                onClick={() => handleUpdate({ tags: editedTask.tags?.filter(t => t !== tag) })}
                                className="w-3 h-3 rounded-full flex items-center justify-center hover:bg-primary/20"
                            >
                                <Icon name="close" className="text-[8px]" />
                            </button>
                        </span>
                    ))}
                    
                    {isAddingTag ? (
                        <input 
                            autoFocus
                            type="text"
                            value={newTagText}
                            onChange={(e) => setNewTagText(e.target.value)}
                            onBlur={handleAddTag}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="Nome..."
                            className="w-24 px-3 py-1 rounded-full bg-white/5 text-white text-xs font-medium border border-primary/50 outline-none"
                        />
                    ) : (
                        <button 
                            onClick={() => setIsAddingTag(true)}
                            className="px-3 py-1 rounded-full bg-white/5 text-slate-400 text-xs font-medium border border-white/5 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            + Adicionar
                        </button>
                    )}
                </div>
            </div>

            {/* Subtasks */}
            <div>
                <div className="flex items-center justify-between mb-3">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtarefas</label>
                     <span className="text-xs text-slate-600">
                        {editedTask.subtasks?.filter(s => s.completed).length || 0}/{(editedTask.subtasks?.length || 0)}
                     </span>
                </div>
                <div className="space-y-2 mb-3">
                    {editedTask.subtasks?.map(sub => (
                        <div key={sub.id} onClick={() => toggleSubtask(sub.id)} className="flex items-center gap-3 p-3 rounded-xl bg-background-dark/50 hover:bg-background-dark border border-white/5 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${sub.completed ? 'bg-green-500 border-green-500' : 'border-slate-600 group-hover:border-primary'}`}>
                                {sub.completed && <Icon name="check" className="text-xs text-white font-bold" />}
                            </div>
                            <span className={`text-sm ${sub.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{sub.title}</span>
                        </div>
                    ))}
                </div>
                <form onSubmit={addSubtask} className="flex gap-2">
                    <input 
                        type="text" 
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        placeholder="Adicionar subtarefa..." 
                        className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-white focus:border-primary outline-none transition-colors placeholder:text-slate-600"
                    />
                    <button type="submit" disabled={!newSubtaskText.trim()} className="text-primary disabled:opacity-50 font-medium text-sm">Adicionar</button>
                </form>
            </div>

            {/* Logs / Timeline */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">Histórico & Logs</label>
                <div className="relative pl-4 border-l border-white/10 space-y-6">
                    {/* Add Log Input */}
                    <div className="relative">
                         <div className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-[#1a222e]"></div>
                         <div className="flex gap-2">
                             <input 
                                type="text"
                                value={newLogText}
                                onChange={(e) => setNewLogText(e.target.value)}
                                placeholder="Adicionar nota ao log..."
                                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary/50"
                                onKeyDown={(e) => e.key === 'Enter' && addLog()}
                             />
                             <button onClick={addLog} className="p-2 bg-primary rounded-lg text-white">
                                <Icon name="send" className="text-sm" />
                             </button>
                         </div>
                    </div>

                    {editedTask.logs?.map(log => (
                        <div key={log.id} className="relative">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/20 ring-4 ring-[#1a222e]"></div>
                            <p className="text-sm text-slate-300">{log.text}</p>
                            <span className="text-[10px] text-slate-600 font-medium">{log.timestamp}</span>
                        </div>
                    ))}
                    
                    {/* Creation info */}
                    <div className="relative">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/10 ring-4 ring-[#1a222e]"></div>
                        <p className="text-sm text-slate-500">Tarefa criada</p>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;