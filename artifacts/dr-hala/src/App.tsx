import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckCircle2, ChevronLeft,
  ChevronRight, Circle, Clock3, Heart, Leaf, ListChecks, Pause, Pencil, Play,
  Plus, RotateCcw, Sparkles, Sprout, Trash2, X,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const STORE_KEY = 'dr-hala-sanctuary-v1';

function damascusDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Damascus', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value ?? '';
  return { year: part('year'), month: part('month'), day: part('day'), hour: Number(part('hour')) };
}

function makeDateKey(year: string, month: string, day: string) {
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return makeDateKey(
    String(date.getUTCFullYear()),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  );
}

type Task = { id: string; title: string; priority: 'high' | 'medium' | 'low'; completed: boolean };
type Habit = { id: string; name: string; completedDate: string | null };
type Exam = { id: string; name: string; date: string };
type Session = { id: string; subject: string; duration: number; completed: boolean; date: string };
type Message = { id: string; text: string };
type Store = {
  tasks: Task[];
  habits: Habit[];
  exams: Exam[];
  sessions: Session[];
  messages: Message[];
  language: 'ar' | 'en';
  timerMode: 'focus' | 'short' | 'long';
  remaining: number;
};

const quotes = [
  'You can do it.',
  'I believe in you.',
  'I’m so proud of you.',
  'Remember, you’re doing this so you can travel.',
  'I’m always here with you and supporting you.',
  'One little page at a time, sweetheart.',
  'You make me proud just by showing up.',
  'Take a breath, love. You have got this.',
];

function Home() {
  const initialDate = damascusDateParts(new Date());
  const initialToday = makeDateKey(initialDate.year, initialDate.month, initialDate.day);
  const seed: Store = {
    tasks: [
      { id: 't1', title: 'Review pharmacology lecture', priority: 'high', completed: false },
      { id: 't2', title: 'Work through chapter three questions', priority: 'medium', completed: false },
      { id: 't3', title: 'Organize this week’s notes', priority: 'low', completed: true },
    ],
    habits: [
      { id: 'h1', name: 'Read ten pages', completedDate: null },
      { id: 'h2', name: 'Drink water regularly', completedDate: null },
      { id: 'h3', name: 'Take a short break between sessions', completedDate: null },
    ],
    exams: [{ id: 'e1', name: 'Pharmacology exam', date: addDaysToDateKey(initialToday, 12) }],
    sessions: [{ id: 's1', subject: 'Anatomy', duration: 45, completed: true, date: initialToday }],
    messages: [],
    language: 'en',
    timerMode: 'focus',
    remaining: 25 * 60,
  };

  const loadStore = (): Store => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return seed;
      const parsed = JSON.parse(raw) as Partial<Store>;
      const sessions = Array.isArray(parsed.sessions) ? parsed.sessions.map(session =>
        session.id === 's1' && session.subject === 'علم التشريح'
          ? { ...session, date: initialToday }
          : session,
      ) : seed.sessions;
      return {
        ...seed,
        ...parsed,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks,
        habits: Array.isArray(parsed.habits) ? parsed.habits : seed.habits,
        exams: Array.isArray(parsed.exams) ? parsed.exams : seed.exams,
        sessions,
        messages: Array.isArray(parsed.messages) ? parsed.messages : seed.messages,
        language: 'en',
        timerMode: ['focus', 'short', 'long'].includes(parsed.timerMode || '') ? parsed.timerMode as Store['timerMode'] : 'focus',
        remaining: Number.isFinite(parsed.remaining) ? Math.max(0, Number(parsed.remaining)) : 25 * 60,
      };
    } catch {
      return seed;
    }
  };

  const [store, setStore] = useState<Store>(loadStore);
  const [clock, setClock] = useState(new Date());
  const dateParts = damascusDateParts(clock);
  const today = makeDateKey(dateParts.year, dateParts.month, dateParts.day);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [month, setMonth] = useState(() => {
    const date = damascusDateParts(new Date());
    return new Date(Number(date.year), Number(date.month) - 1, 15, 12);
  });
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [studySubject, setStudySubject] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<{ kind: 'task' | 'habit' | 'exam'; id?: string } | null>(null);
  const [fields, setFields] = useState({ title: '', date: '', priority: 'medium' as Task['priority'] });
  const [letterEditor, setLetterEditor] = useState(false);
  const [letterDraft, setLetterDraft] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);

  const saveStore = (next: Store | ((current: Store) => Store)) => setStore(current => {
    const value = typeof next === 'function' ? next(current) : next;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(value)); } catch { /* Keep this session usable if storage is unavailable. */ }
    return value;
  });

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* Keep the current in-memory session. */ }
  }, [store]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setStore(previous => ({ ...previous, remaining: Math.max(0, previous.remaining - 1) }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const t = {
    tasksTitle: 'Your little to-do list',
    habitsTitle: 'Sweet little rituals',
    examsTitle: 'Coming up',
    studyTitle: 'Study corner',
    timerTitle: 'A little focus time',
    letterTitle: 'A note from your person',
    calendarTitle: 'Your calendar',
    addTask: 'Add a task',
    addHabit: 'Add a habit',
    addExam: 'Add an exam',
    noTasks: 'Nothing on the list just yet. What would feel good to finish?',
    noHabits: 'Add a small habit you would love to keep.',
    noExam: 'No exams coming up. Enjoy this little breathing room.',
    completed: 'complete',
    priority: 'Priority',
    low: 'Gentle',
    medium: 'Normal',
    high: 'Important',
    date: 'Date',
    subject: 'What are you studying?',
    startStudy: 'Start a study session',
    sessionStarted: 'Your study session has started. I’m cheering you on.',
    focus: 'Focus',
    shortBreak: 'Short break',
    longBreak: 'Long break',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset timer',
    todayStats: 'Look what you did today',
    doneTasks: 'Tasks done',
    studyHours: 'Study hours',
    habitsDone: 'Habits kept',
    save: 'Save',
    cancel: 'Cancel',
    title: 'Task title',
    name: 'Name',
    delete: 'Delete',
    edit: 'Edit',
    progress: 'Today’s progress',
    timerDone: 'You did it, love. You gave your dream some time.',
    sessionInProgress: 'Session in progress',
    sessionsToday: 'sessions today',
  };

  const doneTasksCount = store.tasks.filter(task => task.completed).length;
  const todayHabits = store.habits.filter(habit => habit.completedDate === today).length;
  const todaySessions = store.sessions.filter(session => session.date === today && session.completed);
  const studyTotal = todaySessions.reduce((sum, session) => sum + session.duration, 0);
  const taskProgress = store.tasks.length ? Math.round(doneTasksCount / store.tasks.length * 100) : 0;
  const habitProgress = store.habits.length ? Math.round(todayHabits / store.habits.length * 100) : 0;
  const studyProgress = Math.min(100, Math.round(studyTotal / 120 * 100));
  const overallProgress = Math.round((taskProgress + habitProgress + studyProgress) / 3);
  const nextExam = store.exams.filter(exam => exam.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const [secondsUntil, setSecondsUntil] = useState(0);

  useEffect(() => {
    const tick = () => setSecondsUntil(nextExam ? Math.max(0, Math.floor((new Date(`${nextExam.date}T23:59:59+03:00`).getTime() - Date.now()) / 1000) + 1) : 0);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextExam?.id, nextExam?.date]);

  const timerDurations = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const timerDuration = timerDurations[store.timerMode];
  const timerProgress = Math.min(1, Math.max(0, (timerDuration - store.remaining) / timerDuration));
  const timerTime = `${String(Math.floor(store.remaining / 60)).padStart(2, '0')}:${String(store.remaining % 60).padStart(2, '0')}`;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Damascus' });
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const number = (value: number) => new Intl.NumberFormat('en-US').format(value);
  const dateLabel = clock.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Damascus' });
  const shortDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Damascus' });

  const taskText = (task: Task) => ({
    'مراجعة محاضرة علم الأدوية': 'Review pharmacology lecture',
    'حل أسئلة الفصل الثالث': 'Work through chapter three questions',
    'ترتيب ملخصات الأسبوع': 'Organize this week’s notes',
  } as Record<string, string>)[task.title] || task.title;
  const habitText = (habit: Habit) => ({
    'قراءة عشر صفحات': 'Read ten pages',
    'شرب الماء بانتظام': 'Drink water regularly',
    'استراحة قصيرة بين الجلسات': 'Take a short break between sessions',
  } as Record<string, string>)[habit.name] || habit.name;
  const examText = (exam: Exam) => exam.id === 'e1' && exam.name === 'اختبار علم الأدوية' ? 'Pharmacology exam' : exam.name;
  const sessionSubjectText = (subject: string) => subject === 'علم التشريح' ? 'Anatomy' : subject;
  const builtInLetters = [
    'You are allowed to learn at your own pace. Every page you turn is proof of your courage.',
    'Your presence makes the world softer. I hope you remember how much you are loved.',
    'You have already made it through so many hard days. I believe in the person you are becoming.',
  ];
  const dailyMessages = [...builtInLetters, ...store.messages.map(message => message.text)];
  const dailyLetter = dailyMessages[(Number(dateParts.day) - 1) % dailyMessages.length];

  const toggleTask = (id: string) => saveStore(current => ({ ...current, tasks: current.tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task) }));
  const toggleHabit = (id: string) => saveStore(current => ({ ...current, habits: current.habits.map(habit => habit.id === id ? { ...habit, completedDate: habit.completedDate === today ? null : today } : habit) }));
  const openEditor = (kind: 'task' | 'habit' | 'exam', id?: string) => {
    const item = kind === 'task' ? store.tasks.find(value => value.id === id) : kind === 'habit' ? store.habits.find(value => value.id === id) : store.exams.find(value => value.id === id);
    setFields({
      title: kind === 'task' ? (item as Task | undefined)?.title || '' : kind === 'habit' ? (item as Habit | undefined)?.name || '' : (item as Exam | undefined)?.name || '',
      date: kind === 'exam' ? (item as Exam | undefined)?.date || '' : '',
      priority: (item as Task | undefined)?.priority || 'medium',
    });
    setEditor({ kind, id });
  };
  const submitEditor = (event: FormEvent) => {
    event.preventDefault();
    const name = fields.title.trim();
    if (!name || !editor) return;
    const id = editor.id || `${editor.kind}-${Date.now()}`;
    saveStore(current => {
      if (editor.kind === 'task') return { ...current, tasks: editor.id ? current.tasks.map(task => task.id === id ? { ...task, title: name, priority: fields.priority } : task) : [...current.tasks, { id, title: name, priority: fields.priority, completed: false }] };
      if (editor.kind === 'habit') return { ...current, habits: editor.id ? current.habits.map(habit => habit.id === id ? { ...habit, name } : habit) : [...current.habits, { id, name, completedDate: null }] };
      return { ...current, exams: editor.id ? current.exams.map(exam => exam.id === id ? { ...exam, name, date: fields.date } : exam) : [...current.exams, { id, name, date: fields.date }] };
    });
    setEditor(null);
  };
  const removeTask = (id: string) => saveStore(current => ({ ...current, tasks: current.tasks.filter(task => task.id !== id) }));
  const removeHabit = (id: string) => saveStore(current => ({ ...current, habits: current.habits.filter(habit => habit.id !== id) }));
  const removeExam = (id: string) => saveStore(current => ({ ...current, exams: current.exams.filter(exam => exam.id !== id) }));
  const startSession = () => {
    setStudySubject(subject => subject.trim() || 'Pharmacology');
    setSessionActive(true);
    saveStore(current => ({ ...current, timerMode: 'focus', remaining: 25 * 60 }));
    setTimerRunning(true);
    setNotice(t.sessionStarted);
    window.setTimeout(() => setNotice(''), 2800);
  };
  const saveLetter = (event: FormEvent) => {
    event.preventDefault();
    const text = letterDraft.trim();
    if (!text) return;
    saveStore(current => ({
      ...current,
      messages: editingMessage
        ? current.messages.map(message => message.id === editingMessage ? { ...message, text } : message)
        : [...current.messages, { id: `m-${Date.now()}`, text }],
    }));
    setLetterEditor(false);
    setEditingMessage(null);
    setLetterDraft('');
  };
  const finishTimer = () => {
    setTimerRunning(false);
    if (sessionActive) {
      const subject = studySubject.trim() || 'Study session';
      saveStore(current => ({
        ...current,
        sessions: [...current.sessions, { id: `s-${Date.now()}`, subject, duration: 25, completed: true, date: today }],
      }));
      setSessionActive(false);
    }
    setNotice(t.timerDone);
    window.setTimeout(() => setNotice(''), 3200);
  };

  useEffect(() => {
    if (timerRunning && store.remaining === 0) finishTimer();
  }, [timerRunning, store.remaining]);

  const setMode = (mode: Store['timerMode']) => {
    setTimerRunning(false);
    setSessionActive(false);
    saveStore(current => ({ ...current, timerMode: mode, remaining: timerDurations[mode] }));
  };
  const panel = 'soft-card rounded-[25px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6';

  return (
    <main dir="ltr" className="min-h-[100dvh] text-[hsl(var(--foreground))]" data-testid="page-home">
      <div className="mx-auto max-w-[1120px] px-4 pb-10 pt-5 sm:px-7 sm:pt-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="serif-display text-[26px] leading-none tracking-tight sm:text-[31px]">zeze time</p>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">your little study nook</p>
          </div>
          <div className="hidden rounded-2xl border border-[hsl(var(--border))] bg-white/75 px-4 py-2.5 text-right sm:block">
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]" data-testid="text-current-date">{dateLabel}</p>
            <p className="mt-0.5 text-xs font-bold">{dateParts.hour < 12 ? 'Good morning, lovely' : 'Good evening, lovely'}</p>
          </div>
        </header>

        <section className="page-enter relative mb-6 overflow-hidden rounded-[30px] border border-pink-200/80 bg-[linear-gradient(118deg,#fff4f8_0%,#fffafd_48%,#edf8ff_100%)] px-5 py-7 shadow-[0_18px_50px_rgba(204,143,173,.13)] sm:px-9 sm:py-9" data-testid="section-encouragement">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 h-56 w-56 rounded-full border border-pink-200/70" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-1 top-0 h-40 w-40 rounded-full border border-sky-200/70" />
          <div className="relative z-10 max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]"><Heart size={14} /> a little love note for today</p>
            <p className="serif-display min-h-[90px] max-w-xl text-[32px] leading-[1.18] text-[hsl(var(--foreground))] sm:min-h-[105px] sm:text-[44px]" data-testid="text-encouragement">“{quotes[quoteIndex]}”</p>
            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => setQuoteIndex(index => (index + 1) % quotes.length)} className="flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:opacity-90" aria-label="Show another love note" data-testid="button-next-encouragement">One more, please <ArrowRight size={15} /></button>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{quoteIndex + 1} of {quotes.length}</span>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-5 right-8 hidden text-pink-300/70 sm:block"><Sparkles size={30} /></div>
        </section>

        <section className="mb-6 grid grid-cols-3 gap-3" aria-label="Today at a glance">
          <div className="rounded-[21px] border border-pink-100 bg-white/90 px-3 py-4 text-center shadow-sm sm:px-5">
            <span className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-xl bg-pink-50 text-[hsl(var(--primary))]"><CheckCircle2 size={16} /></span>
            <strong className="block text-xl">{number(doneTasksCount)}</strong><span className="text-[10px] text-[hsl(var(--muted-foreground))] sm:text-xs">{t.doneTasks}</span>
          </div>
          <div className="rounded-[21px] border border-sky-100 bg-white/90 px-3 py-4 text-center shadow-sm sm:px-5">
            <span className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-sky-600"><Clock3 size={16} /></span>
            <strong className="block text-xl">{number(Number((studyTotal / 60).toFixed(1)))}</strong><span className="text-[10px] text-[hsl(var(--muted-foreground))] sm:text-xs">{t.studyHours}</span>
          </div>
          <div className="rounded-[21px] border border-blue-100 bg-white/90 px-3 py-4 text-center shadow-sm sm:px-5">
            <span className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-500"><Leaf size={16} /></span>
            <strong className="block text-xl">{number(todayHabits)}</strong><span className="text-[10px] text-[hsl(var(--muted-foreground))] sm:text-xs">{t.habitsDone}</span>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]">
          <section className={panel} data-testid="section-tasks">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><div className="flex items-center gap-2"><ListChecks size={18} className="text-[hsl(var(--primary))]" /><h2 className="text-lg font-extrabold">{t.tasksTitle}</h2></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-task-progress">{number(doneTasksCount)} of {number(store.tasks.length)} {t.completed}</p></div>
              <button onClick={() => openEditor('task')} className="flex items-center gap-1.5 rounded-xl bg-pink-50 px-3 py-2 text-xs font-bold text-[hsl(var(--primary))] hover:bg-pink-100" data-testid="button-add-task"><Plus size={15} />{t.addTask}</button>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-pink-50"><div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-500" style={{ width: `${taskProgress}%` }} data-testid="progress-tasks" /></div>
            <div className="space-y-1">
              {store.tasks.length ? store.tasks.map(task => <div key={task.id} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-pink-50/70" data-testid={`task-row-${task.id}`}>
                <button aria-label={`${task.completed ? 'Uncomplete' : 'Complete'} ${taskText(task)}`} onClick={() => toggleTask(task.id)} className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${task.completed ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white' : 'border-pink-300 text-transparent hover:border-[hsl(var(--primary))]'}`} data-testid={`button-complete-task-${task.id}`}><Check size={12} /></button>
                <span className={`min-w-0 flex-1 truncate text-sm ${task.completed ? 'text-[hsl(var(--muted-foreground))] line-through' : ''}`} data-testid={`text-task-${task.id}`}>{taskText(task)}</span>
                <span className={`hidden rounded-full px-2 py-1 text-[10px] sm:inline ${task.priority === 'high' ? 'bg-pink-100 text-pink-700' : task.priority === 'medium' ? 'bg-sky-50 text-sky-700' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`status-priority-${task.id}`}>{task.priority === 'high' ? t.high : task.priority === 'medium' ? t.medium : t.low}</span>
                <button onClick={() => openEditor('task', task.id)} aria-label={`${t.edit}: ${taskText(task)}`} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] opacity-70 hover:text-[hsl(var(--primary))] md:opacity-0 md:group-hover:opacity-100" data-testid={`button-edit-task-${task.id}`}><Pencil size={14} /></button>
                <button onClick={() => removeTask(task.id)} aria-label={`${t.delete}: ${taskText(task)}`} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] opacity-70 hover:text-[hsl(var(--destructive))] md:opacity-0 md:group-hover:opacity-100" data-testid={`button-delete-task-${task.id}`}><Trash2 size={14} /></button>
              </div>) : <div className="rounded-xl bg-[hsl(var(--muted))]/65 px-4 py-7 text-center text-sm leading-7 text-[hsl(var(--muted-foreground))]" data-testid="empty-tasks">{t.noTasks}</div>}
            </div>
          </section>

          <section className={panel} data-testid="section-habits">
            <div className="mb-4 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Sprout size={18} className="text-sky-600" /><h2 className="text-lg font-extrabold">{t.habitsTitle}</h2></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-habit-progress">{number(todayHabits)} of {number(store.habits.length)} complete</p></div><button onClick={() => openEditor('habit')} aria-label={t.addHabit} className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100" data-testid="button-add-habit"><Plus size={17} /></button></div>
            <div className="mb-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-sky-50"><div className="h-full rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${habitProgress}%` }} data-testid="progress-habits" /></div><span className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-habit-percent">{number(habitProgress)}%</span></div>
            <div className="space-y-1">
              {store.habits.length ? store.habits.map(habit => <div className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-sky-50/70" key={habit.id} data-testid={`habit-row-${habit.id}`}>
                <button onClick={() => toggleHabit(habit.id)} aria-label={`${habit.completedDate === today ? 'Undo habit' : 'Complete habit'}: ${habitText(habit)}`} className={`grid h-5 w-5 place-items-center rounded-full border ${habit.completedDate === today ? 'border-sky-500 bg-sky-500 text-white' : 'border-sky-300'}`} data-testid={`button-complete-habit-${habit.id}`}>{habit.completedDate === today ? <Check size={12} /> : <Circle size={8} />}</button>
                <span className={`flex-1 text-sm ${habit.completedDate === today ? 'text-[hsl(var(--muted-foreground))] line-through' : ''}`} data-testid={`text-habit-${habit.id}`}>{habitText(habit)}</span>
                <button onClick={() => openEditor('habit', habit.id)} className="p-1 text-[hsl(var(--muted-foreground))] opacity-70 hover:text-[hsl(var(--primary))] md:opacity-0 md:group-hover:opacity-100" aria-label={`${t.edit}: ${habitText(habit)}`} data-testid={`button-edit-habit-${habit.id}`}><Pencil size={13} /></button>
                <button onClick={() => removeHabit(habit.id)} className="p-1 text-[hsl(var(--muted-foreground))] opacity-70 hover:text-[hsl(var(--destructive))] md:opacity-0 md:group-hover:opacity-100" aria-label={`${t.delete}: ${habitText(habit)}`} data-testid={`button-delete-habit-${habit.id}`}><Trash2 size={13} /></button>
              </div>) : <div className="rounded-xl bg-[hsl(var(--muted))]/65 px-4 py-6 text-center text-sm leading-7 text-[hsl(var(--muted-foreground))]" data-testid="empty-habits">{t.noHabits}</div>}
            </div>
            {store.habits.length > 0 && habitProgress === 100 && <p className="gentle-celebration mt-3 rounded-xl bg-sky-50 px-3 py-2 text-center text-xs font-bold text-sky-700" data-testid="status-habits-celebration">Look at you, keeping all your little promises to yourself.</p>}
          </section>

          <section className={panel} data-testid="section-exams">
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-[hsl(var(--primary))]" /><h2 className="text-lg font-extrabold">{t.examsTitle}</h2></div><button onClick={() => openEditor('exam')} className="grid h-9 w-9 place-items-center rounded-xl bg-pink-50 text-[hsl(var(--primary))]" aria-label={t.addExam} data-testid="button-add-exam"><Plus size={17} /></button></div>
            {nextExam ? <div className="rounded-2xl bg-[linear-gradient(130deg,#fff0f6,#eff9ff)] p-4" data-testid={`card-nearest-exam-${nextExam.id}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold" data-testid={`text-exam-name-${nextExam.id}`}>{examText(nextExam)}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid={`text-exam-date-${nextExam.id}`}>{shortDate(nextExam.date)}</p></div><div className="flex gap-1"><button onClick={() => openEditor('exam', nextExam.id)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" aria-label={t.edit} data-testid={`button-edit-exam-${nextExam.id}`}><Pencil size={14} /></button><button onClick={() => removeExam(nextExam.id)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" aria-label={t.delete} data-testid={`button-delete-exam-${nextExam.id}`}><Trash2 size={14} /></button></div></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">{[
                { label: 'days', value: Math.floor(secondsUntil / 86400), testId: 'countdown-days' },
                { label: 'hours', value: Math.floor(secondsUntil % 86400 / 3600), testId: 'countdown-hours' },
                { label: 'minutes', value: Math.floor(secondsUntil % 3600 / 60), testId: 'countdown-minutes' },
              ].map(item => <div className="rounded-xl bg-white/75 py-2" key={item.label}><strong className="block font-mono text-lg" data-testid={item.testId}>{number(item.value)}</strong><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.label}</span></div>)}</div>
            </div> : <div className="rounded-xl bg-[hsl(var(--muted))]/65 px-3 py-7 text-center text-sm leading-7 text-[hsl(var(--muted-foreground))]" data-testid="empty-exams">{t.noExam}</div>}
            {store.exams.filter(exam => exam.id !== nextExam?.id).map(exam => <div key={exam.id} className="mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-pink-50/70" data-testid={`exam-row-${exam.id}`}><span>{examText(exam)}</span><span className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">{shortDate(exam.date)}<button onClick={() => openEditor('exam', exam.id)} aria-label={t.edit} data-testid={`button-edit-exam-${exam.id}`}><Pencil size={13} /></button><button onClick={() => removeExam(exam.id)} aria-label={t.delete} data-testid={`button-delete-exam-${exam.id}`}><Trash2 size={13} /></button></span></div>)}
          </section>

          <section className={panel} data-testid="section-study">
            <div className="mb-4 flex items-center gap-2"><BookOpen size={18} className="text-sky-600" /><h2 className="text-lg font-extrabold">{t.studyTitle}</h2></div>
            <div className="flex items-center gap-4 rounded-2xl bg-sky-50/80 p-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-600"><BookOpen size={19} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold" data-testid="text-study-subject">{sessionActive ? (studySubject || 'Study session') : todaySessions.length ? sessionSubjectText(todaySessions[todaySessions.length - 1].subject) : 'A cozy little space for your next idea'}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-study-today">{number(todaySessions.length)} {t.sessionsToday} · {number(studyTotal)} minutes today</p></div><div className="text-right"><span className="text-lg font-extrabold" data-testid="text-study-progress">{number(studyProgress)}%</span><span className="block text-[10px] text-[hsl(var(--muted-foreground))]">of your goal</span></div></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-sky-50"><div className="h-full rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${studyProgress}%` }} data-testid="progress-study" /></div>
            <label className="mt-4 block space-y-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]"><span>{t.subject}</span><input value={studySubject} onChange={event => setStudySubject(event.target.value)} placeholder="For example, anatomy" className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]" data-testid="input-study-subject" /></label>
            <button onClick={startSession} disabled={sessionActive} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-100 px-4 py-3 text-sm font-extrabold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-70" data-testid="button-start-study"><Play size={15} fill="currentColor" />{sessionActive ? t.sessionInProgress : t.startStudy}</button>
            <p className="mt-2 text-center text-[10px] text-[hsl(var(--muted-foreground))]">Every session counts toward your day.</p>
          </section>

          <section className={`${panel} lg:col-span-1`} data-testid="section-timer">
            <div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-[hsl(var(--primary))]" /><h2 className="text-lg font-extrabold">{t.timerTitle}</h2></div>
            <div className="mb-5 flex rounded-xl bg-pink-50 p-1">{(['focus', 'short', 'long'] as const).map(mode => <button key={mode} onClick={() => setMode(mode)} className={`flex-1 rounded-lg px-1 py-2 text-[11px] transition ${store.timerMode === mode ? 'bg-white font-extrabold text-[hsl(var(--primary))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`button-timer-mode-${mode}`}>{mode === 'focus' ? t.focus : mode === 'short' ? t.shortBreak : t.longBreak}</button>)}</div>
            <div className="flex flex-col items-center">
              <div className="relative grid h-40 w-40 place-items-center">
                <svg className="-rotate-90" viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="69" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" /><circle cx="80" cy="80" r="69" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" strokeDasharray={433.54} strokeDashoffset={433.54 * (1 - timerProgress)} className="transition-[stroke-dashoffset] duration-1000" /></svg>
                <div className="absolute text-center"><strong className="font-mono text-[34px] font-medium tracking-tight" data-testid="text-timer-countdown">{timerTime}</strong><span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">{store.timerMode === 'focus' ? t.focus : store.timerMode === 'short' ? t.shortBreak : t.longBreak}</span></div>
              </div>
              <div className="mt-2 flex items-center gap-3"><button onClick={() => setTimerRunning(running => !running)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-90" data-testid="button-timer-toggle">{timerRunning ? <><Pause size={15} />{t.pause}</> : <><Play size={15} fill="currentColor" />{t.start}</>}</button><button onClick={() => { setTimerRunning(false); setSessionActive(false); saveStore(current => ({ ...current, remaining: timerDuration })); }} aria-label={t.reset} className="grid h-10 w-10 place-items-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" data-testid="button-timer-reset"><RotateCcw size={16} /></button></div>
            </div>
          </section>

          <section className={`${panel} lg:col-span-1`} data-testid="section-statistics">
            <div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-sky-600" /><h2 className="text-lg font-extrabold">{t.todayStats}</h2></div>
            <div className="rounded-2xl bg-[linear-gradient(110deg,#fff1f6,#eff9ff)] p-4"><div className="mb-2 flex items-center justify-between text-xs"><span className="text-[hsl(var(--muted-foreground))]">{t.progress}</span><strong data-testid="stat-overall-progress">{number(overallProgress)}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),#83c9e8)] transition-all duration-500" style={{ width: `${overallProgress}%` }} data-testid="progress-overall" /></div><p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Every small step belongs in the story you’re writing.</p></div>
          </section>

          <section className="relative overflow-hidden rounded-[25px] border border-pink-200/75 bg-[linear-gradient(135deg,#fff2f7,#fffafc)] p-5 sm:p-6" data-testid="section-love-letter">
            <div className="heart-float pointer-events-none absolute -bottom-6 -left-4 text-pink-200/60"><Heart size={105} strokeWidth={.8} /></div>
            <div className="relative"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[hsl(var(--primary))]"><Heart size={17} /><h2 className="text-lg font-extrabold">{t.letterTitle}</h2></div><button onClick={() => { setLetterDraft(''); setEditingMessage(null); setLetterEditor(true); }} className="rounded-lg p-2 text-[hsl(var(--primary))] hover:bg-white/75" aria-label="Add a love note" data-testid="button-add-love-note"><Plus size={16} /></button></div>
              <p className="serif-display min-h-[74px] text-[18px] leading-8 text-[hsl(var(--foreground))]" data-testid="text-love-letter">{dailyLetter}</p>
              {!store.messages.length && <p className="mt-1 text-xs leading-6 text-[hsl(var(--muted-foreground))]">A little reminder: you are loved, capable, and celebrated every day.</p>}
              {store.messages.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{store.messages.map(message => <div key={message.id} className="flex max-w-full items-center gap-1 rounded-full border border-pink-200 bg-white/75 px-2.5 py-1 text-[10px]"><span className="max-w-32 truncate">{message.text}</span><button onClick={() => { setLetterDraft(message.text); setEditingMessage(message.id); setLetterEditor(true); }} aria-label={`Edit note: ${message.text}`} data-testid={`button-edit-message-${message.id}`}><Pencil size={11} /></button><button onClick={() => saveStore(current => ({ ...current, messages: current.messages.filter(item => item.id !== message.id) }))} aria-label={`Delete note: ${message.text}`} data-testid={`button-delete-message-${message.id}`}><X size={12} /></button></div>)}</div>}
            </div>
          </section>

          <section className={panel} data-testid="section-calendar">
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-[hsl(var(--primary))]" /><h2 className="text-lg font-extrabold">{t.calendarTitle}</h2></div><div className="flex items-center gap-1"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-pink-50" data-testid="button-calendar-previous"><ChevronLeft size={17} /></button><span className="min-w-24 text-center text-xs font-bold" data-testid="text-calendar-month">{monthLabel}</span><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-pink-50" data-testid="button-calendar-next"><ChevronRight size={17} /></button></div></div>
            <div className="grid grid-cols-7 gap-y-1 text-center">{weekDays.map((day, index) => <span className="py-2 text-[10px] font-bold text-[hsl(var(--muted-foreground))]" key={`${day}-${index}`}>{day}</span>)}{Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const isToday = day === Number(dateParts.day) && month.getMonth() === Number(dateParts.month) - 1 && month.getFullYear() === Number(dateParts.year); return <span key={day} className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs ${isToday ? 'bg-[hsl(var(--primary))] font-extrabold text-white shadow-sm' : 'text-[hsl(var(--foreground))]'}`} data-testid={`calendar-day-${day}`}>{number(day)}</span>; })}</div>
            <p className="mt-3 flex items-center gap-2 border-t border-[hsl(var(--border))]/70 pt-3 text-[10px] text-[hsl(var(--muted-foreground))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />Today · {dateLabel}</p>
          </section>
        </div>
        <footer className="mt-8 flex items-center justify-center gap-2 text-[11px] font-bold text-[hsl(var(--muted-foreground))]"><Heart size={12} className="text-[hsl(var(--primary))]" />A little corner made just for you</footer>
      </div>

      {notice && <div role="status" aria-live="polite" className={`completion-pop fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[hsl(var(--foreground))] px-5 py-3 text-sm text-white shadow-xl`} data-testid="status-notice">{notice}</div>}
      {(editor || letterEditor) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#5f4352]/30 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) { setEditor(null); setLetterEditor(false); } }} data-testid="dialog-backdrop">
        <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="w-full max-w-md rounded-[25px] border border-pink-100 bg-[hsl(var(--card))] p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between"><h2 id="dialog-title" className="serif-display text-2xl">{letterEditor ? t.letterTitle : editor?.kind === 'task' ? t.tasksTitle : editor?.kind === 'habit' ? t.habitsTitle : t.examsTitle}</h2><button onClick={() => { setEditor(null); setLetterEditor(false); }} aria-label={t.cancel} data-testid="button-close-dialog" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[hsl(var(--muted))]"><X size={17} /></button></div>
          {letterEditor ? <form onSubmit={saveLetter} className="space-y-4"><textarea autoFocus value={letterDraft} onChange={event => setLetterDraft(event.target.value)} placeholder="Write your sweet note here..." rows={5} className="w-full resize-none rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-sm leading-7 outline-none focus:border-[hsl(var(--primary))]" data-testid="input-love-letter" /><div className="flex justify-end gap-2"><button type="button" onClick={() => { setLetterEditor(false); setEditingMessage(null); }} className="rounded-xl px-4 py-2 text-sm text-[hsl(var(--muted-foreground))]" data-testid="button-cancel-letter">{t.cancel}</button><button className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-sm font-extrabold text-white" data-testid="button-save-letter">{t.save}</button></div></form> :
            <form onSubmit={submitEditor} className="space-y-4">
              <label className="block space-y-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]"><span>{editor?.kind === 'habit' || editor?.kind === 'exam' ? t.name : t.title}</span><input autoFocus value={fields.title} onChange={event => setFields(current => ({ ...current, title: event.target.value }))} required className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]" data-testid="input-editor-title" /></label>
              {editor?.kind === 'exam' && <label className="block space-y-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]"><span>{t.date}</span><input type="date" value={fields.date} onChange={event => setFields(current => ({ ...current, date: event.target.value }))} required min={today} className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]" data-testid="input-exam-date" /></label>}
              {editor?.kind === 'task' && <label className="block space-y-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]"><span>{t.priority}</span><select value={fields.priority} onChange={event => setFields(current => ({ ...current, priority: event.target.value as Task['priority'] }))} className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]" data-testid="select-task-priority"><option value="low">{t.low}</option><option value="medium">{t.medium}</option><option value="high">{t.high}</option></select></label>}
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditor(null)} className="rounded-xl px-4 py-2 text-sm text-[hsl(var(--muted-foreground))]" data-testid="button-cancel-editor">{t.cancel}</button><button type="submit" className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-sm font-extrabold text-white" data-testid="button-save-editor">{t.save}</button></div>
            </form>}
        </div>
      </div>}
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
