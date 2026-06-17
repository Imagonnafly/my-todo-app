import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

function App() {
  // --- Ultimate State Management ---
  const [todos, setTodos] = useState(() => JSON.parse(localStorage.getItem('omega_todos')) || []);
  const [trash, setTrash] = useState(() => JSON.parse(localStorage.getItem('omega_trash')) || []);
  const [archive, setArchive] = useState(() => JSON.parse(localStorage.getItem('omega_archive')) || []);
  const [xp, setXp] = useState(() => JSON.parse(localStorage.getItem('omega_xp')) || 0);
  const [streak, setStreak] = useState(() => JSON.parse(localStorage.getItem('omega_streak')) || 0);
  const [lastActive, setLastActive] = useState(() => localStorage.getItem('omega_last_active') || '');
  const [theme, setTheme] = useState(() => localStorage.getItem('omega_theme') || 'dark');
  const [view, setView] = useState('Active');
  const [layout, setLayout] = useState('List'); // List or Grid

  // UI & Active Elements
  const [toasts, setToasts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);

  // Pomodoro State
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);

  // Input States
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('Work');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('Newest');
  const [quickFilter, setQuickFilter] = useState('All');
  const searchRef = useRef(null);

  // --- Persistence & Timers ---
  useEffect(() => {
    localStorage.setItem('omega_todos', JSON.stringify(todos));
    localStorage.setItem('omega_trash', JSON.stringify(trash));
    localStorage.setItem('omega_archive', JSON.stringify(archive));
    localStorage.setItem('omega_xp', JSON.stringify(xp));
    localStorage.setItem('omega_streak', JSON.stringify(streak));
    localStorage.setItem('omega_last_active', lastActive);
    localStorage.setItem('omega_theme', theme);
  }, [todos, trash, archive, xp, streak, lastActive, theme]);

  // Streak Checker
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastActive && lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastActive !== yesterday.toDateString()) setStreak(0);
    }
  }, [lastActive]);

  // Global Clock & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const interval = setInterval(() => {
      if (pomoActive && pomoTime > 0) setPomoTime(t => t - 1);
      else if (pomoTime === 0 && pomoActive) {
        setPomoActive(false);
        showToast('🍅 Pomodoro Complete! +50 XP', 'success');
        setXp(x => x + 50);
        setPomoTime(25 * 60);
      }
      setTodos(prev => prev.map(t => t.isRunning ? { ...t, timeSpent: (t.timeSpent || 0) + 1 } : t));
    }, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pomoActive, pomoTime]);

  // --- Helper Functions ---
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const triggerConfetti = (x, y) => {
    const newConfetti = Array.from({ length: 15 }).map((_, i) => ({ id: Date.now() + i, left: x + (Math.random() * 100 - 50), top: y + (Math.random() * 50 - 50) }));
    setConfetti(prev => [...prev, ...newConfetti]);
    setTimeout(() => setConfetti([]), 2000);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  };

  const getCountdown = (date, time) => {
    if (!date) return null;
    const due = new Date(`${date}T${time || '23:59'}`);
    const now = new Date();
    const diff = due - now;
    if (diff < 0) return 'Overdue!';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return 'Due soon!';
  };

  // --- Task Actions ---
  const addTask = () => {
    if (!input.trim()) return showToast('Task cannot be empty!', 'error');
    const newTask = {
      id: Date.now(), text: input, category, priority, dueDate, dueTime, notes,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      completed: false, pinned: false, isRunning: false, timeSpent: 0, subtasks: [], locked: false, createdAt: new Date().toISOString()
    };
    setTodos([newTask, ...todos]);
    setInput(''); setTags(''); setNotes(''); setDueDate(''); setDueTime('');
    showToast('Task Added!', 'success');
  };

  const toggleComplete = (e, id) => {
    e.stopPropagation();
    setTodos(todos.map(t => {
      if (t.id === id) {
        if (t.locked) { showToast('Task is locked!', 'error'); return t; }
        const isNowComplete = !t.completed;
        if (isNowComplete) {
          setXp(xp + 25);
          setStreak(streak + 1);
          setLastActive(new Date().toDateString());
          showToast('Task Completed! +25 XP', 'success');
          triggerConfetti(e.clientX, e.clientY);
        }
        return { ...t, completed: isNowComplete, isRunning: false };
      }
      return t;
    }));
  };

  const toggleLock = (e, id) => {
    e.stopPropagation();
    setTodos(todos.map(t => t.id === id ? { ...t, locked: !t.locked } : t));
    showToast('Lock status updated');
  };

  const toggleTimer = (e, id) => {
    e.stopPropagation();
    setTodos(todos.map(t => t.id === id && !t.locked ? { ...t, isRunning: !t.isRunning } : t));
  };

  const addSubtask = (e, id) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const val = e.target.value;
      setTodos(todos.map(t => t.id === id && !t.locked ? { ...t, subtasks: [...(t.subtasks || []), { id: Date.now(), text: val, done: false }] } : t));
      e.target.value = '';
    }
  };

  const toggleSubtask = (taskId, subId) => {
    setTodos(todos.map(t => t.id === taskId && !t.locked ? { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s) } : t));
  };

  // --- Bulk & Move Actions ---
  const toggleSelect = (id) => {
    setSelectedTasks(prev => prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]);
  };

  const bulkAction = (action) => {
    if (action === 'delete') {
      const tasksToMove = todos.filter(t => selectedTasks.includes(t.id) && !t.locked);
      setTodos(todos.filter(t => !selectedTasks.includes(t.id) || t.locked));
      setTrash([...tasksToMove, ...trash]);
      showToast(`Deleted ${tasksToMove.length} tasks`);
    } else if (action === 'complete') {
      setTodos(todos.map(t => selectedTasks.includes(t.id) && !t.locked ? { ...t, completed: true } : t));
      showToast('Tasks completed!');
    }
    setSelectedTasks([]);
  };

  const moveTask = (task, targetList, originListStr) => {
    if (task.locked) return showToast('Task is locked!', 'error');
    if (originListStr === 'Active') setTodos(todos.filter(t => t.id !== task.id));
    if (originListStr === 'Trash') setTrash(trash.filter(t => t.id !== task.id));
    if (originListStr === 'Archive') setArchive(archive.filter(t => t.id !== task.id));

    if (targetList === 'Trash') setTrash([task, ...trash]);
    if (targetList === 'Archive') setArchive([task, ...archive]);
    if (targetList === 'Active') setTodos([task, ...todos]);
    showToast(`Moved to ${targetList}`);
  };

  // --- Exports ---
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.todos) setTodos(data.todos);
        if (data.xp) setXp(data.xp);
        showToast('Backup restored!', 'success');
      } catch (err) { showToast('Invalid file', 'error'); }
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const headers = "ID,Text,Category,Priority,Completed,DueDate\n";
    const rows = todos.map(t => `${t.id},"${t.text}",${t.category},${t.priority},${t.completed},${t.dueDate || 'None'}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tasks.csv'; a.click();
    showToast('CSV Exported!', 'success');
  };

  // --- Derived State ---
  const displayedTasks = useMemo(() => {
    let list = view === 'Active' ? todos : view === 'Archive' ? archive : trash;
    
    if (search) list = list.filter(t => t.text.toLowerCase().includes(search.toLowerCase()) || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))));
    
    if (quickFilter === 'Due Today') {
      const today = new Date().toISOString().split('T')[0];
      list = list.filter(t => t.dueDate === today);
    } else if (quickFilter === 'High Priority') {
      list = list.filter(t => t.priority === 'Critical' || t.priority === 'High');
    }

    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      if (sortBy === 'Newest') return b.id - a.id;
      if (sortBy === 'Priority') {
        const p = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        return p[b.priority] - p[a.priority];
      }
      return 0;
    });
  }, [todos, archive, trash, view, search, sortBy, quickFilter]);

  // Themes list to cycle through
  const themes = ['light', 'dark', 'cyberpunk'];
  const cycleTheme = () => setTheme(themes[(themes.indexOf(theme) + 1) % themes.length]);

  return (
    <div className={`omega-app ${theme}`}>
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
      </div>
      {confetti.map(c => <div key={c.id} className="confetti-particle" style={{ left: c.left, top: c.top }}>✨</div>)}

      <div className="glass-panel">
        {/* Header */}
        <header>
          <div className="logo-area">
            <h1>Task Master <span className="gradient-text">OMEGA</span></h1>
            <div className="gamification-stats">
              <span className="level-badge">🏆 Lvl {Math.floor(xp / 100) + 1} ({xp} XP)</span>
              <span className="streak-badge">🔥 {streak} Day Streak</span>
            </div>
          </div>
          <div className="controls">
            <button className="icon-btn" onClick={cycleTheme} title="Change Theme">🎨</button>
            <button className="icon-btn" onClick={() => setLayout(layout === 'List' ? 'Grid' : 'List')} title="Toggle View">{layout === 'List' ? '🔲' : '☰'}</button>
            <label className="icon-btn" title="Import JSON">📂<input type="file" hidden accept=".json" onChange={handleImport} /></label>
            <button className="icon-btn" onClick={exportCSV} title="Export CSV">📊</button>
          </div>
        </header>

        {/* Pomodoro */}
        <div className="pomodoro-bar">
          <span>🍅 Focus Timer: <b>{Math.floor(pomoTime / 60).toString().padStart(2, '0')}:{(pomoTime % 60).toString().padStart(2, '0')}</b></span>
          <div>
            <button onClick={() => setPomoActive(!pomoActive)}>{pomoActive ? '⏸️ Pause' : '▶️ Start'}</button>
            <button onClick={() => { setPomoTime(25 * 60); setPomoActive(false); }}>🔄 Reset</button>
          </div>
        </div>

        {/* Smart Input */}
        {view === 'Active' && (
          <div className="input-section">
            <div className="main-input-row">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="What needs to be done? (Press Enter)" onKeyDown={e => e.key === 'Enter' && addTask()} autoFocus />
              <button className="glow-btn" onClick={addTask}>Add Task</button>
            </div>
            <div className="meta-input-row">
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Work">💼 Work</option><option value="Personal">🏠 Personal</option><option value="Study">📚 Study</option>
              </select>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="Critical">🔴 Critical</option><option value="High">🟠 High</option><option value="Medium">🟡 Medium</option><option value="Low">🟢 Low</option>
              </select>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} title="Due Date" />
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} title="Due Time" />
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="#tags (comma separated)" />
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Rich notes / Descriptions..." rows="2"></textarea>
          </div>
        )}

        {/* Filters & Nav */}
        <div className="nav-bar">
          <div className="tabs">
            {['Active', 'Archive', 'Trash'].map(v => (
              <button key={v} className={view === v ? 'active-tab' : ''} onClick={() => setView(v)}>{v}</button>
            ))}
          </div>
          <div className="filters">
            <div className="search-wrapper">
              <input ref={searchRef} placeholder="🔍 Search (Ctrl+K)..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={quickFilter} onChange={e => setQuickFilter(e.target.value)}>
              <option value="All">All Tasks</option><option value="Due Today">Due Today</option><option value="High Priority">High Priority</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="Newest">Newest</option><option value="Priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedTasks.length > 0 && view === 'Active' && (
          <div className="bulk-actions">
            <span>{selectedTasks.length} Selected</span>
            <button onClick={() => bulkAction('complete')}>✅ Complete</button>
            <button className="danger" onClick={() => bulkAction('delete')}>🗑️ Delete</button>
            <button onClick={() => setSelectedTasks([])}>❌ Cancel</button>
          </div>
        )}

        {/* Task Container */}
        <div className={`task-container ${layout.toLowerCase()}-view`}>
          {displayedTasks.map((todo, index) => {
            const subCount = todo.subtasks?.length || 0;
            const subDone = todo.subtasks?.filter(s => s.done).length || 0;
            const progress = subCount === 0 ? 0 : (subDone / subCount) * 100;
            const isExpanded = expandedId === todo.id;
            const countdown = getCountdown(todo.dueDate, todo.dueTime);

            return (
              <div key={todo.id} className={`task-card ${todo.completed ? 'completed' : ''} ${todo.pinned ? 'pinned' : ''} ${todo.locked ? 'locked' : ''}`} style={{ animationDelay: `${index * 0.05}s` }}>
                
                <div className="task-header" onClick={() => setExpandedId(isExpanded ? null : todo.id)}>
                  <div className="task-title-area">
                    {view === 'Active' && (
                      <input type="checkbox" className="multi-select" checked={selectedTasks.includes(todo.id)} onChange={() => toggleSelect(todo.id)} onClick={e => e.stopPropagation()} />
                    )}
                    {view === 'Active' && (
                      <button className="check-btn" onClick={(e) => toggleComplete(e, todo.id)}>
                        {todo.completed ? '🟢' : '⚪'}
                      </button>
                    )}
                    <h3>{todo.locked && '🔒 '}{todo.text}</h3>
                    {todo.isRunning && <span className="pulse-dot">🔴</span>}
                  </div>
                  
                  <div className="task-badges">
                    <span className="badge cat">{todo.category}</span>
                    <span className={`badge prio-${todo.priority.toLowerCase()}`}>{todo.priority}</span>
                    {countdown && <span className={`badge timer ${countdown.includes('Overdue') ? 'danger' : ''}`}>⏳ {countdown}</span>}
                  </div>
                </div>

                <div className={`task-details ${isExpanded ? 'open' : ''}`}>
                  {todo.notes && <p className="task-notes">📝 {todo.notes}</p>}
                  
                  {todo.tags?.length > 0 && (
                    <div className="tag-list">{todo.tags.map(t => <span key={t} className="tag">#{t}</span>)}</div>
                  )}

                  <div className="subtask-area">
                    {subCount > 0 && (
                      <div className="mini-progress"><div className="mini-fill" style={{ width: `${progress}%` }}></div></div>
                    )}
                    {todo.subtasks?.map(s => (
                      <div key={s.id} className="subtask">
                        <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(todo.id, s.id)} disabled={todo.locked} />
                        <span className={s.done ? 'done-text' : ''}>{s.text}</span>
                      </div>
                    ))}
                    {view === 'Active' && !todo.locked && <input className="sub-input" placeholder="➕ Add subtask & press Enter..." onKeyDown={(e) => addSubtask(e, todo.id)} />}
                  </div>

                  <div className="action-bar">
                    {view === 'Active' && (
                      <>
                        <button className="action-btn" onClick={(e) => toggleTimer(e, todo.id)} disabled={todo.locked}>{todo.isRunning ? '🛑 Stop' : '▶️ Track Time'}</button>
                        <button className="action-btn" onClick={() => setTodos(todos.map(t => t.id === todo.id ? { ...t, pinned: !t.pinned } : t))}>📌 Pin</button>
                        <button className="action-btn" onClick={(e) => toggleLock(e, todo.id)}>{todo.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
                        <button className="action-btn" onClick={() => moveTask(todo, 'Archive', 'Active')} disabled={todo.locked}>📦 Archive</button>
                        <button className="action-btn danger" onClick={() => moveTask(todo, 'Trash', 'Active')} disabled={todo.locked}>🗑️</button>
                      </>
                    )}
                    {view !== 'Active' && (
                      <>
                        <button className="action-btn" onClick={() => moveTask(todo, 'Active', view)}>🔄 Restore</button>
                        {view === 'Trash' && <button className="action-btn danger" onClick={() => setTrash(trash.filter(t => t.id !== todo.id))}>❌ Delete</button>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;