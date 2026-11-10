import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronLeft, ChevronRight, Circle, Clock3, Flower2, Heart, ListChecks, Menu,
  Pause, Pencil, Play, Plus, RotateCcw, Sparkles, Sprout, Target, Trash2,
  X, Languages, Sun, Leaf, BarChart3,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function damascusDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Damascus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value ?? '';
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: Number(part('hour')),
  };
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

function Home() {
  type Task = { id: string; title: string; priority: 'high' | 'medium' | 'low'; completed: boolean };
  type Habit = { id: string; name: string; completedDate: string | null };
  type Exam = { id: string; name: string; date: string };
  type Session = { id: string; subject: string; duration: number; completed: boolean; date: string };
  type Message = { id: string; text: string };
  type Store = { tasks: Task[]; habits: Habit[]; exams: Exam[]; sessions: Session[]; messages: Message[]; language: 'ar' | 'en'; timerMode: 'focus' | 'short' | 'long'; remaining: number };
  const key = 'dr-hala-sanctuary-v1';
  const initialDate = damascusDateParts(new Date());
  const initialToday = makeDateKey(initialDate.year, initialDate.month, initialDate.day);
  const seed: Store = {
    tasks: [
      { id: 't1', title: 'مراجعة محاضرة علم الأدوية', priority: 'high', completed: false },
      { id: 't2', title: 'حل أسئلة الفصل الثالث', priority: 'medium', completed: false },
      { id: 't3', title: 'ترتيب ملخصات الأسبوع', priority: 'low', completed: true },
    ],
    habits: [
      { id: 'h1', name: 'قراءة عشر صفحات', completedDate: null },
      { id: 'h2', name: 'شرب الماء بانتظام', completedDate: null },
      { id: 'h3', name: 'استراحة قصيرة بين الجلسات', completedDate: null },
    ],
    exams: [{ id: 'e1', name: 'اختبار علم الأدوية', date: addDaysToDateKey(initialToday, 12) }],
    sessions: [{ id: 's1', subject: 'علم التشريح', duration: 45, completed: true, date: initialToday }],
    messages: [], language: 'ar', timerMode: 'focus', remaining: 25 * 60,
  };
  const loadStore = (): Store => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return seed;
      const parsed = JSON.parse(raw) as Partial<Store>;
      return {
        ...seed, ...parsed,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks,
        habits: Array.isArray(parsed.habits) ? parsed.habits : seed.habits,
        exams: Array.isArray(parsed.exams) ? parsed.exams : seed.exams,
        sessions: Array.isArray(parsed.sessions)
          ? parsed.sessions.map(session =>
              session.id === 's1' && session.subject === 'علم التشريح'
                ? { ...session, date: initialToday }
                : session,
            )
          : seed.sessions,
        messages: Array.isArray(parsed.messages) ? parsed.messages : seed.messages,
        language: parsed.language === 'en' ? 'en' : 'ar',
        timerMode: ['focus', 'short', 'long'].includes(parsed.timerMode || '') ? parsed.timerMode as Store['timerMode'] : 'focus',
        remaining: Number.isFinite(parsed.remaining) ? Math.max(0, Number(parsed.remaining)) : 1500,
      };
    } catch { return seed; }
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
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('section-home');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<{ kind: 'task' | 'habit' | 'exam'; id?: string } | null>(null);
  const [fields, setFields] = useState({ title: '', date: '', priority: 'medium' as Task['priority'] });
  const [letterEditor, setLetterEditor] = useState(false);
  const [letterDraft, setLetterDraft] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const en = store.language === 'en';
  const tr = (ar: string, english: string) => en ? english : ar;
  const t = {
    hello: tr('أهلًا يا هالة', 'Hello, Hala'), home: tr('الرئيسية', 'Home'), tasks: tr('مهامي', 'My tasks'),
    habits: tr('عاداتي', 'My habits'), study: tr('دراستي', 'My studies'), exams: tr('الامتحانات', 'Exams'),
    stats: tr('الإحصائيات', 'Insights'), settings: tr('الإعدادات', 'Settings'), today: tr('مساحة هادئة ليومك', 'A gentle space for your day'),
    next: tr('رسالة أخرى', 'Another note'), todayFocus: tr('خطوة صغيرة اليوم، تصنع فرقًا كبيرًا غدًا.', 'One small step today can make a meaningful difference tomorrow.'),
    tasksTitle: tr('ما أود إنجازه', 'What I’d like to do'), habitsTitle: tr('عاداتي اللطيفة', 'Gentle rituals'),
    examsTitle: tr('موعد يقترب', 'Coming up'), studyTitle: tr('مساحة الدراسة', 'Study nook'), timerTitle: tr('وقت التركيز', 'Focus time'),
     letterTitle: tr('رسالة من شخص يحبك', 'A letter from someone who loves you'), calendarTitle: tr('تقويمك', 'Your calendar'), addTask: tr('مهمة جديدة', 'Add a task'),
    addHabit: tr('عادة جديدة', 'Add a ritual'), addExam: tr('إضافة اختبار', 'Add an exam'), noTasks: tr('لا شيء يثقل يومك الآن. ابدئي بما يهمك.', 'Nothing weighing on your day. Begin with what matters.'),
    noHabits: tr('أضيفي عادة صغيرة تحبين أن ترافق يومك.', 'Add a small ritual you’d like to carry through your day.'),
    noExam: tr('لا توجد اختبارات قريبة. خذي نفسًا مطمئنًا.', 'No upcoming exams. Take a reassuring breath.'),
    completed: tr('مكتمل', 'complete'), progress: tr('تقدم اليوم', 'Today’s progress'), priority: tr('الأولوية', 'Priority'),
    low: tr('هادئة', 'Gentle'), medium: tr('عادية', 'Normal'), high: tr('مهمة', 'Important'), date: tr('التاريخ', 'Date'),
    subject: tr('المادة', 'Subject'), duration: tr('المدة بالدقائق', 'Minutes'), startStudy: tr('ابدئي جلسة دراسة', 'Start a study session'),
    sessionStarted: tr('بدأت جلستك، أنتِ في الطريق.', 'Your session has begun. You’re on your way.'), focus: tr('تركيز', 'Focus'),
    shortBreak: tr('استراحة قصيرة', 'Short break'), longBreak: tr('استراحة طويلة', 'Long break'),
    start: tr('ابدئي', 'Start'), pause: tr('إيقاف مؤقت', 'Pause'), reset: tr('إعادة', 'Reset'),
    todayStats: tr('أثر يومك حتى الآن', 'Your day, so far'), doneTasks: tr('مهام أُنجزت', 'Tasks done'),
    studyHours: tr('ساعات دراسة', 'Study hours'), habitsDone: tr('عادات اكتملت', 'Rituals kept'),
    save: tr('حفظ', 'Save'), cancel: tr('إلغاء', 'Cancel'), title: tr('العنوان', 'Title'), name: tr('الاسم', 'Name'),
    delete: tr('حذف', 'Delete'), edit: tr('تعديل', 'Edit'), dayQuote: tr('هذا اليوم لكِ، خذيه على مهل.', 'This day is yours; take it gently.'),
    completedAll: tr('أحسنتِ يا هالة، لقد اعتنيتِ بنفسك اليوم.', 'Beautifully done, Hala. You showed up for yourself today.'),
    noLetter: tr('مساحتكِ هنا تذكّرك دائمًا: أنتِ محبوبة، وقادرة، ويُحتفى بكِ.', 'Let this space remind you: you are loved, capable, and deeply appreciated.'),
    letterPlaceholder: tr('اكتبي كلماتكِ الحنونة هنا…', 'Write your kind words here…'), addNote: tr('أضيفي رسالتك', 'Add your note'),
    overallProgress: tr('تقدمكِ اليوم', 'Your progress today'),
    timerDone: tr('أحسنتِ، لقد منحتِ حلمكِ وقتًا ثمينًا.', 'Beautifully done. You gave your dream some precious time.'),
    sessionInProgress: tr('جلستكِ جارية الآن', 'Session in progress'),
    sessionsToday: tr('جلسات اليوم', 'sessions today'),
  };
  const encouragement = en
    ? ['You do not need to do it all at once. Begin where you are.', 'Your steady effort is worth celebrating, even on quiet days.', 'You are more capable than the doubt that visits you.']
    : ['لا تحتاجين إلى إنجاز كل شيء دفعة واحدة. ابدئي من حيث أنتِ.', 'اجتهادكِ الهادئ يستحق الاحتفاء، حتى في الأيام العادية.', 'أنتِ أقدر من أي شكّ يزوركِ.'];
  const builtInLetters = en
    ? ['You are allowed to learn at your own pace. Every page you turn is proof of your courage.', 'Your presence makes the world softer. I hope you remember how much you are loved.', 'You have already made it through so many hard days. I believe in the person you are becoming.']
    : ['من حقكِ أن تتعلمي على مهل. كل صفحة تقرئينها دليل على شجاعتكِ.', 'وجودكِ يجعل العالم ألطف. أتمنى أن تتذكري كم أنتِ محبوبة.', 'عبرتِ أيامًا صعبة كثيرة، وأنا أؤمن بالشخص الذي تصبحين عليه.'];
  const saveStore = (next: Store | ((s: Store) => Store)) => setStore(previous => {
    const value = typeof next === 'function' ? next(previous) : next;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable; the session remains usable. */ }
    return value;
  });
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(store)); } catch { /* Keep the current in-memory session. */ }
  }, [store]);
  useEffect(() => {
    document.documentElement.lang = store.language;
    document.documentElement.dir = store.language === 'en' ? 'ltr' : 'rtl';
  }, [store.language]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setStore(previous => {
        const remaining = Math.max(0, previous.remaining - 1);
        return { ...previous, remaining };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);
  useEffect(() => {
    if (!timerRunning || store.remaining > 0) return;
    setTimerRunning(false);
    if (sessionActive) {
      const subject = studySubject.trim() || (en ? 'Study session' : 'جلسة دراسة');
      saveStore(s => ({
        ...s,
        sessions: [...s.sessions, {
          id: `s-${Date.now()}`,
          subject,
          duration: 25,
          completed: true,
          date: today,
        }],
      }));
      setSessionActive(false);
    }
    setNotice(t.timerDone);
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [timerRunning, store.remaining, sessionActive, studySubject, en, today, t.timerDone]);
  const dateLabel = clock.toLocaleDateString(en ? 'en-US' : 'ar', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Damascus',
  });
  const greeting = dateParts.hour < 12 ? tr('صباح الخير', 'Good morning') : tr('مساء الخير', 'Good evening');
  const doneTasksCount = store.tasks.filter(x => x.completed).length;
  const todayHabits = store.habits.filter(x => x.completedDate === today).length;
  const todaySessions = store.sessions.filter(x => x.date === today && x.completed);
  const studyTotal = todaySessions.reduce((sum, session) => sum + session.duration, 0);
  const taskProgress = store.tasks.length ? Math.round(doneTasksCount / store.tasks.length * 100) : 0;
  const habitProgress = store.habits.length ? Math.round(todayHabits / store.habits.length * 100) : 0;
  const studyProgress = Math.min(100, Math.round(studyTotal / 120 * 100));
  const overallProgress = Math.round((taskProgress + habitProgress + studyProgress) / 3);
  const nextExam = store.exams.filter(x => x.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
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
  const monthLabel = month.toLocaleDateString(en ? 'en-US' : 'ar', { month: 'long', year: 'numeric', timeZone: 'Asia/Damascus' });
  const weekDays = en ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] : ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
  const localizedNumber = (value: number) => new Intl.NumberFormat(en ? 'en' : 'ar').format(value);
  const shortDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(en ? 'en-US' : 'ar', { month: 'short', day: 'numeric', timeZone: 'Asia/Damascus' });
  const taskText = (task: Task) => en ? ({
    t1: ['مراجعة محاضرة علم الأدوية', 'Review pharmacology lecture'],
    t2: ['حل أسئلة الفصل الثالث', 'Work through chapter three questions'],
    t3: ['ترتيب ملخصات الأسبوع', 'Organize this week’s notes'],
  } as Record<string, string[]>)[task.id]?.[1] || task.title : task.title;
  const habitText = (habit: Habit) => en ? ({
    h1: ['قراءة عشر صفحات', 'Read ten pages'],
    h2: ['شرب الماء بانتظام', 'Drink water regularly'],
    h3: ['استراحة قصيرة بين الجلسات', 'Take a short break between sessions'],
  } as Record<string, string[]>)[habit.id]?.[1] || habit.name : habit.name;
  const examText = (exam: Exam) => en && exam.id === 'e1' && exam.name === 'اختبار علم الأدوية' ? 'Pharmacology exam' : exam.name;
  const dailyMessages = [...builtInLetters, ...store.messages.map(message => message.text)];
  const dailyLetter = dailyMessages[(Number(dateParts.day) - 1) % dailyMessages.length];
  const toggleTask = (id: string) => saveStore(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) }));
  const toggleHabit = (id: string) => saveStore(s => ({ ...s, habits: s.habits.map(h => h.id === id ? { ...h, completedDate: h.completedDate === today ? null : today } : h) }));
  const openEditor = (kind: 'task' | 'habit' | 'exam', id?: string) => {
    const item = kind === 'task' ? store.tasks.find(x => x.id === id) : kind === 'habit' ? store.habits.find(x => x.id === id) : store.exams.find(x => x.id === id);
    setFields({ title: kind === 'task' ? (item as Task | undefined)?.title || '' : kind === 'habit' ? (item as Habit | undefined)?.name || '' : (item as Exam | undefined)?.name || '', date: kind === 'exam' ? (item as Exam | undefined)?.date || '' : '', priority: (item as Task | undefined)?.priority || 'medium' });
    setEditor({ kind, id });
  };
  const submitEditor = (event: FormEvent) => {
    event.preventDefault();
    const name = fields.title.trim();
    if (!name) return;
    const id = editor?.id || `${editor?.kind}-${Date.now()}`;
    saveStore(s => {
      if (editor?.kind === 'task') return { ...s, tasks: editor.id ? s.tasks.map(x => x.id === id ? { ...x, title: name, priority: fields.priority } : x) : [...s.tasks, { id, title: name, priority: fields.priority, completed: false }] };
      if (editor?.kind === 'habit') return { ...s, habits: editor.id ? s.habits.map(x => x.id === id ? { ...x, name } : x) : [...s.habits, { id, name, completedDate: null }] };
      return { ...s, exams: editor?.id ? s.exams.map(x => x.id === id ? { ...x, name, date: fields.date } : x) : [...s.exams, { id, name, date: fields.date }] };
    });
    setEditor(null);
  };
  const removeTask = (id: string) => saveStore(s => ({ ...s, tasks: s.tasks.filter(x => x.id !== id) }));
  const removeHabit = (id: string) => saveStore(s => ({ ...s, habits: s.habits.filter(x => x.id !== id) }));
  const removeExam = (id: string) => saveStore(s => ({ ...s, exams: s.exams.filter(x => x.id !== id) }));
  const startSession = () => {
    setStudySubject(subject => subject.trim() || (en ? 'Pharmacology' : 'علم الأدوية'));
    setSessionActive(true);
    saveStore(s => ({ ...s, timerMode: 'focus', remaining: 25 * 60 }));
    setTimerRunning(true);
    setNotice(t.sessionStarted);
    window.setTimeout(() => setNotice(''), 2800);
  };
  const saveLetter = (event: FormEvent) => {
    event.preventDefault();
    const text = letterDraft.trim();
    if (!text) return;
    saveStore(s => ({ ...s, messages: editingMessage ? s.messages.map(m => m.id === editingMessage ? { ...m, text } : m) : [...s.messages, { id: `m-${Date.now()}`, text }] }));
    setLetterEditor(false); setEditingMessage(null); setLetterDraft('');
  };
  const navItems = [
    { label: t.home, icon: Flower2, target: 'section-home' },
    { label: t.tasks, icon: ListChecks, target: 'section-tasks' },
    { label: t.habits, icon: Sprout, target: 'section-habits' },
    { label: t.study, icon: BookOpen, target: 'section-study' },
    { label: t.exams, icon: CalendarDays, target: 'section-exams' },
    { label: t.stats, icon: BarChart3, target: 'section-statistics' },
    { label: t.settings, icon: Target, target: 'section-settings' },
  ];
  const toggleLanguage = () => saveStore(s => ({ ...s, language: s.language === 'ar' ? 'en' : 'ar' }));
  const setMode = (mode: Store['timerMode']) => {
    setTimerRunning(false);
    setSessionActive(false);
    saveStore(s => ({ ...s, timerMode: mode, remaining: timerDurations[mode] }));
  };
  const direction = en ? 'ltr' : 'rtl';
  return (
    <div dir={direction} className={`min-h-[100dvh] text-[hsl(var(--foreground))] ${en ? '' : 'font-arabic'}`} data-testid="page-home">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1560px]">
        <aside className={`fixed inset-y-0 z-30 w-[248px] border-[hsl(var(--border))] bg-[hsl(var(--sidebar))]/90 px-5 py-7 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0 ${navOpen ? 'translate-x-0' : en ? '-translate-x-full md:translate-x-0' : 'translate-x-full md:translate-x-0'} ${en ? 'left-0 border-r' : 'right-0 border-l'}`}>
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Flower2 size={23}/></div>
            <div><div className="serif-display text-[24px] leading-none">{en ? 'Dr. Hala' : 'د. هالة'}</div><div className="mt-1 text-[11px] tracking-[.16em] text-[hsl(var(--muted-foreground))]">{en ? 'YOUR QUIET CORNER' : 'مساحتكِ الهادئة'}</div></div>
          </div>
          <div className="mb-3 px-3 text-[10px] font-semibold tracking-[.18em] text-[hsl(var(--muted-foreground))]">{en ? 'YOUR SPACE' : 'مساحتكِ'}</div>
          <nav aria-label={en ? 'Main navigation' : 'التنقل الرئيسي'} className="space-y-1">
            {navItems.map(({label, icon: Icon, target}, index) => <button key={target} onClick={() => {
              setNavOpen(false);
              setActiveSection(target);
              document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }} data-testid={`nav-${index}`} aria-current={activeSection === target ? 'location' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-[14px] transition-colors ${activeSection === target ? 'bg-[hsl(var(--primary))]/10 font-semibold text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card))] hover:text-[hsl(var(--foreground))]'}`}><Icon size={18} strokeWidth={1.7}/><span className="flex-1">{label}</span>{activeSection === target && <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]"/>}</button>)}
          </nav>
          <div className="absolute bottom-6 inset-x-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--primary))]"><Heart size={15}/><span className="text-xs font-semibold">{en ? 'A gentle reminder' : 'تذكير حنون'}</span></div>
            <p className="text-xs leading-6 text-[hsl(var(--muted-foreground))]">{en ? 'You deserve rest as much as you deserve to reach your dreams.' : 'تستحقين الراحة بقدر ما تستحقين الوصول إلى أحلامكِ.'}</p>
          </div>
        </aside>
        {navOpen && <button aria-label={en ? 'Close navigation' : 'إغلاق التنقل'} className="fixed inset-0 z-20 bg-[#3d2632]/20 md:hidden" onClick={() => setNavOpen(false)} data-testid="button-close-navigation"/>}
        <main className="min-w-0 flex-1 px-4 pb-12 pt-5 sm:px-7 lg:px-10 lg:pt-8">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button aria-label={en ? 'Open navigation' : 'فتح التنقل'} onClick={() => setNavOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] md:hidden" data-testid="button-open-navigation"><Menu size={19}/></button>
              <div className="hidden h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--card))] text-[hsl(var(--primary))] sm:grid"><Sun size={19} strokeWidth={1.7}/></div>
              <div><p className="text-[11px] text-[hsl(var(--muted-foreground))]" data-testid="text-current-date">{dateLabel}</p><p className="text-sm font-semibold">{tr('كل شيء يبدأ بخطوة هادئة', 'Everything begins with a gentle step')}</p></div>
            </div>
            <button onClick={toggleLanguage} className="flex h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" aria-label={en ? 'Switch to Arabic' : 'Switch to English'} data-testid="button-language"><Languages size={16}/><span>{en ? 'العربية' : 'English'}</span></button>
          </header>
          <section id="section-home" className="page-enter relative mb-6 scroll-mt-6 overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(115deg,hsl(18_40%_92%)_0%,hsl(37_43%_96%)_54%,hsl(334_30%_93%)_100%)] px-6 py-7 sm:px-9 sm:py-9">
            <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border border-[hsl(var(--primary))]/10"/><div className="pointer-events-none absolute -right-1 top-2 h-36 w-36 rounded-full border border-[hsl(var(--primary))]/10"/>
            <div className="relative z-10 max-w-3xl">
              <p className="mb-2 text-sm text-[hsl(var(--primary))]" data-testid="text-greeting">{greeting} {en ? 'Hala' : 'يا حلا'}</p>
              <h1 className="serif-display mb-2 text-[32px] leading-tight text-[hsl(var(--foreground))] sm:text-[42px]" data-testid="text-welcome">{en ? 'You are doing beautifully.' : 'أنتِ تبلي بلاءً جميلًا.'}</h1>
              <p className="max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">{en ? 'A little room to learn, breathe, and make today your own.' : 'مساحة صغيرة لتتعلمي، وتتنفسي، وتجعلين هذا اليوم يشبهكِ.'}</p>
            </div>
            <div className="relative z-10 mt-6 flex max-w-3xl items-center justify-between gap-4 rounded-2xl border border-white/65 bg-white/45 px-4 py-3 backdrop-blur-sm sm:px-5">
              <div className="flex items-start gap-3"><Sparkles className="mt-1 shrink-0 text-[hsl(var(--primary))]" size={17}/><p className="text-sm leading-6" data-testid="text-encouragement">{encouragement[quoteIndex]}</p></div>
              <button onClick={() => setQuoteIndex(i => (i + 1) % encouragement.length)} aria-label={t.next} data-testid="button-next-encouragement" className="shrink-0 rounded-full p-2 text-[hsl(var(--primary))] hover:bg-white/70">{en ? <ArrowRight size={17}/> : <ArrowLeft size={17}/>}</button>
            </div>
            <div className="pointer-events-none absolute bottom-3 right-7 hidden text-[hsl(var(--primary))]/25 sm:block"><Sprout size={95} strokeWidth={.75}/></div>
          </section>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.95fr)]">
            <section className="soft-card rounded-[24px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-tasks">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div><div className="flex items-center gap-2"><ListChecks size={18} className="text-[hsl(var(--primary))]"/><h2 className="text-lg font-semibold">{t.tasksTitle}</h2></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-task-progress">{localizedNumber(doneTasksCount)} {tr('من', 'of')} {localizedNumber(store.tasks.length)} {t.completed}</p></div>
                <button onClick={() => openEditor('task')} className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))]/10 px-3 py-2 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/15" data-testid="button-add-task"><Plus size={15}/>{t.addTask}</button>
              </div>
              <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-500" style={{width: `${taskProgress}%`}} data-testid="progress-tasks"/></div>
              <div className="space-y-2">
                {store.tasks.length ? store.tasks.map(task => <div key={task.id} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[hsl(var(--muted))]/55" data-testid={`task-row-${task.id}`}>
                  <button aria-label={`${task.completed ? tr('إلغاء إنجاز', 'Uncomplete') : tr('إنجاز', 'Complete')} ${task.title}`} onClick={() => toggleTask(task.id)} data-testid={`button-complete-task-${task.id}`} className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${task.completed ? 'border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))] text-white' : 'border-[hsl(var(--input))] text-transparent hover:border-[hsl(var(--primary))]'}`}><Check size={12}/></button>
                  <span className={`min-w-0 flex-1 truncate text-sm ${task.completed ? 'text-[hsl(var(--muted-foreground))] line-through' : ''}`} data-testid={`text-task-${task.id}`}>{taskText(task)}</span>
                  <span className={`hidden rounded-full px-2 py-1 text-[10px] sm:inline ${task.priority === 'high' ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]' : task.priority === 'medium' ? 'bg-[hsl(var(--accent))]/40 text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`status-priority-${task.id}`}>{task.priority === 'high' ? t.high : task.priority === 'medium' ? t.medium : t.low}</span>
                  <button onClick={() => openEditor('task', task.id)} aria-label={`${t.edit}: ${task.title}`} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] opacity-60 hover:text-[hsl(var(--primary))] md:opacity-0 md:group-hover:opacity-100" data-testid={`button-edit-task-${task.id}`}><Pencil size={14}/></button>
                  <button onClick={() => removeTask(task.id)} aria-label={`${t.delete}: ${task.title}`} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] opacity-60 hover:text-[hsl(var(--destructive))] md:opacity-0 md:group-hover:opacity-100" data-testid={`button-delete-task-${task.id}`}><Trash2 size={14}/></button>
                </div>) : <div className="rounded-xl bg-[hsl(var(--muted))]/45 px-4 py-7 text-center text-sm leading-7 text-[hsl(var(--muted-foreground))]" data-testid="empty-tasks">{t.noTasks}</div>}
              </div>
            </section>
            <section className="soft-card rounded-[24px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-habits">
              <div className="mb-4 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Sprout size={18} className="text-[hsl(var(--chart-3))]"/><h2 className="text-lg font-semibold">{t.habitsTitle}</h2></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-habit-progress">{localizedNumber(todayHabits)} {tr('من', 'of')} {localizedNumber(store.habits.length)} {t.completed}</p></div><button onClick={() => openEditor('habit')} aria-label={t.addHabit} className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))] hover:bg-[hsl(var(--chart-3))]/20" data-testid="button-add-habit"><Plus size={17}/></button></div>
              <div className="mb-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--chart-3))] transition-all duration-500" style={{width: `${habitProgress}%`}} data-testid="progress-habits"/></div><span className="text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-habit-percent">{localizedNumber(habitProgress)}%</span></div>
              <div className="space-y-1">
                {store.habits.length ? store.habits.map(habit => <div className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[hsl(var(--muted))]/55" key={habit.id} data-testid={`habit-row-${habit.id}`}>
                  <button onClick={() => toggleHabit(habit.id)} aria-label={`${habit.completedDate === today ? tr('إلغاء العادة', 'Undo ritual') : tr('إكمال العادة', 'Complete ritual')}: ${habit.name}`} className={`grid h-5 w-5 place-items-center rounded-full border ${habit.completedDate === today ? 'border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))] text-white' : 'border-[hsl(var(--input))]'}`} data-testid={`button-complete-habit-${habit.id}`}>{habit.completedDate === today ? <Check size={12}/> : <Circle size={8}/>}</button>
                  <span className={`flex-1 text-sm ${habit.completedDate === today ? 'text-[hsl(var(--muted-foreground))] line-through' : ''}`} data-testid={`text-habit-${habit.id}`}>{habitText(habit)}</span><button onClick={() => openEditor('habit', habit.id)} className="p-1 text-[hsl(var(--muted-foreground))] opacity-60 hover:text-[hsl(var(--primary))] md:opacity-0 md:group-hover:opacity-100" aria-label={`${t.edit}: ${habitText(habit)}`} data-testid={`button-edit-habit-${habit.id}`}><Pencil size={13}/></button><button onClick={() => removeHabit(habit.id)} className="p-1 text-[hsl(var(--muted-foreground))] opacity-60 hover:text-[hsl(var(--destructive))] md:opacity-0 md:group-hover:opacity-100" aria-label={`${t.delete}: ${habitText(habit)}`} data-testid={`button-delete-habit-${habit.id}`}><Trash2 size={13}/></button>
                </div>) : <div className="rounded-xl bg-[hsl(var(--muted))]/45 px-4 py-6 text-center text-sm leading-7 text-[hsl(var(--muted-foreground))]" data-testid="empty-habits">{t.noHabits}</div>}
              </div>
              {store.habits.length > 0 && habitProgress === 100 && <p className="gentle-celebration mt-3 rounded-xl bg-[hsl(var(--chart-3))]/10 px-3 py-2 text-center text-xs text-[hsl(var(--chart-3))]" data-testid="status-habits-celebration">{t.completedAll}</p>}
            </section>
            <section className="soft-card rounded-[24px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-exams">
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-[hsl(var(--primary))]"/><h2 className="text-lg font-semibold">{t.examsTitle}</h2></div><button onClick={() => openEditor('exam')} className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" aria-label={t.addExam} data-testid="button-add-exam"><Plus size={17}/></button></div>
              {nextExam ? <div className="rounded-2xl bg-[linear-gradient(130deg,hsl(340_28%_48%/0.10),hsl(40_42%_83%/0.3))] p-4" data-testid={`card-nearest-exam-${nextExam.id}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold" data-testid={`text-exam-name-${nextExam.id}`}>{examText(nextExam)}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid={`text-exam-date-${nextExam.id}`}>{shortDate(nextExam.date)}</p></div><div className="flex gap-1"><button onClick={() => openEditor('exam', nextExam.id)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" aria-label={t.edit} data-testid={`button-edit-exam-${nextExam.id}`}><Pencil size={14}/></button><button onClick={() => removeExam(nextExam.id)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" aria-label={t.delete} data-testid={`button-delete-exam-${nextExam.id}`}><Trash2 size={14}/></button></div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[hsl(var(--card))]/65 py-2"><strong className="block font-mono text-lg" data-testid="countdown-days">{localizedNumber(Math.floor(secondsUntil / 86400))}</strong><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{tr('يوم', 'days')}</span></div><div className="rounded-xl bg-[hsl(var(--card))]/65 py-2"><strong className="block font-mono text-lg" data-testid="countdown-hours">{localizedNumber(Math.floor(secondsUntil % 86400 / 3600))}</strong><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{tr('ساعة', 'hours')}</span></div><div className="rounded-xl bg-[hsl(var(--card))]/65 py-2"><strong className="block font-mono text-lg" data-testid="countdown-minutes">{localizedNumber(Math.floor(secondsUntil % 3600 / 60))}</strong><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{tr('دقيقة', 'minutes')}</span></div></div></div> : <div className="rounded-xl bg-[hsl(var(--muted))]/45 px-3 py-7 text-center text-sm leading-7 text-[hsl(var(--muted-foreground))]" data-testid="empty-exams">{t.noExam}</div>}
              {store.exams.filter(x => x.id !== nextExam?.id).map(exam => <div key={exam.id} className="mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]/50" data-testid={`exam-row-${exam.id}`}><span>{examText(exam)}</span><span className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">{shortDate(exam.date)}<button onClick={() => openEditor('exam', exam.id)} aria-label={t.edit} data-testid={`button-edit-exam-${exam.id}`}><Pencil size={13}/></button><button onClick={() => removeExam(exam.id)} aria-label={t.delete} data-testid={`button-delete-exam-${exam.id}`}><Trash2 size={13}/></button></span></div>)}
            </section>
            <section className="soft-card rounded-[24px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-study">
              <div className="mb-4 flex items-center gap-2"><BookOpen size={18} className="text-[hsl(var(--chart-3))]"/><h2 className="text-lg font-semibold">{t.studyTitle}</h2></div>
              <div className="flex items-center gap-4 rounded-2xl bg-[hsl(var(--chart-3))]/8 p-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--chart-3))]/12 text-[hsl(var(--chart-3))]"><BookOpen size={19}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold" data-testid="text-study-subject">{sessionActive ? (studySubject || tr('جلسة دراسة', 'Study session')) : todaySessions.length ? (en && todaySessions[todaySessions.length - 1].subject === 'علم التشريح' ? 'Anatomy' : todaySessions[todaySessions.length - 1].subject) : tr('مساحة تنتظر فكرتك', 'A space waiting for your ideas')}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-study-today">{localizedNumber(todaySessions.length)} {t.sessionsToday} · {localizedNumber(studyTotal)} {tr('دقيقة اليوم', 'minutes today')}</p></div><div className="text-end"><span className="text-lg font-semibold" data-testid="text-study-progress">{localizedNumber(studyProgress)}%</span><span className="block text-[10px] text-[hsl(var(--muted-foreground))]">{tr('من هدفك', 'of your goal')}</span></div></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--chart-3))] transition-all duration-500" style={{width: `${studyProgress}%`}} data-testid="progress-study"/></div>
              <label className="mt-4 block space-y-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]"><span>{t.subject}</span><input value={studySubject} onChange={e => setStudySubject(e.target.value)} placeholder={tr('مثال: علم التشريح', 'e.g. Anatomy')} className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]" data-testid="input-study-subject"/></label>
              <button onClick={startSession} disabled={sessionActive} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--chart-3))]/12 px-4 py-3 text-sm font-semibold text-[hsl(var(--chart-3))] hover:bg-[hsl(var(--chart-3))]/20 disabled:cursor-not-allowed disabled:opacity-70" data-testid="button-start-study"><Play size={15} fill="currentColor"/>{sessionActive ? t.sessionInProgress : t.startStudy}</button>
              <p className="mt-2 text-center text-[10px] text-[hsl(var(--muted-foreground))]">{tr('كل جلسة تُحتسب ضمن إنجازك اليومي', 'Every session adds to your daily progress')}</p>
            </section>
            <section className="soft-card rounded-[24px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-timer">
              <div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-[hsl(var(--primary))]"/><h2 className="text-lg font-semibold">{t.timerTitle}</h2></div>
              <div className="mb-5 flex rounded-xl bg-[hsl(var(--muted))]/65 p-1">{(['focus','short','long'] as const).map(mode => <button key={mode} onClick={() => setMode(mode)} className={`flex-1 rounded-lg px-1 py-2 text-[11px] transition ${store.timerMode === mode ? 'bg-[hsl(var(--card))] font-semibold text-[hsl(var(--primary))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`button-timer-mode-${mode}`}>{mode === 'focus' ? t.focus : mode === 'short' ? t.shortBreak : t.longBreak}</button>)}</div>
              <div className="flex flex-col items-center">
                <div className="relative grid h-40 w-40 place-items-center">
                  <svg className="-rotate-90" viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="69" fill="none" stroke="hsl(var(--muted))" strokeWidth="5"/><circle cx="80" cy="80" r="69" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" strokeDasharray={433.54} strokeDashoffset={433.54 * (1 - timerProgress)} className="transition-[stroke-dashoffset] duration-1000"/></svg>
                  <div className="absolute text-center"><strong className="font-mono text-[34px] font-medium tracking-tight" data-testid="text-timer-countdown">{timerTime}</strong><span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">{store.timerMode === 'focus' ? t.focus : store.timerMode === 'short' ? t.shortBreak : t.longBreak}</span></div>
                </div>
                <div className="mt-2 flex items-center gap-3"><button onClick={() => setTimerRunning(r => !r)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90" data-testid="button-timer-toggle">{timerRunning ? <><Pause size={15}/>{t.pause}</> : <><Play size={15} fill="currentColor"/>{t.start}</>}</button><button onClick={() => { setTimerRunning(false); setSessionActive(false); saveStore(s => ({ ...s, remaining: timerDuration })); }} aria-label={t.reset} className="grid h-10 w-10 place-items-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" data-testid="button-timer-reset"><RotateCcw size={16}/></button></div>
              </div>
            </section>
            <section className="soft-card rounded-[24px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-statistics">
              <div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-[hsl(var(--chart-4))]"/><h2 className="text-lg font-semibold">{t.todayStats}</h2></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-[hsl(var(--primary))]/8 px-2 py-4 text-center"><div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"><CheckCircle2 size={16}/></div><strong className="block text-xl" data-testid="stat-tasks">{localizedNumber(doneTasksCount)}</strong><span className="mt-1 block text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{t.doneTasks}</span></div>
                <div className="rounded-2xl bg-[hsl(var(--chart-3))]/8 px-2 py-4 text-center"><div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-xl bg-[hsl(var(--chart-3))]/12 text-[hsl(var(--chart-3))]"><Clock3 size={16}/></div><strong className="block text-xl" data-testid="stat-study-hours">{localizedNumber(Number((studyTotal / 60).toFixed(1)))}</strong><span className="mt-1 block text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{t.studyHours}</span></div>
                <div className="rounded-2xl bg-[hsl(var(--chart-4))]/15 px-2 py-4 text-center"><div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-xl bg-[hsl(var(--chart-4))]/20 text-[hsl(var(--chart-4))]"><Leaf size={16}/></div><strong className="block text-xl" data-testid="stat-habits">{localizedNumber(todayHabits)}</strong><span className="mt-1 block text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{t.habitsDone}</span></div>
              </div>
              <div className="mt-4"><div className="mb-2 flex items-center justify-between text-xs"><span className="text-[hsl(var(--muted-foreground))]">{t.overallProgress}</span><strong data-testid="stat-overall-progress">{localizedNumber(overallProgress)}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--chart-3)))] transition-all duration-500" style={{width: `${overallProgress}%`}} data-testid="progress-overall"/></div></div>
            </section>
            <section className="relative overflow-hidden rounded-[24px] border border-[hsl(var(--accent))]/55 bg-[linear-gradient(135deg,hsl(39_45%_92%),hsl(17_42%_94%))] p-5 sm:p-6" data-testid="section-love-letter">
              <div className="heart-float pointer-events-none absolute -bottom-6 -left-4 text-[hsl(var(--primary))]/10"><Heart size={105} strokeWidth={.8}/></div>
              <div className="relative"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[hsl(var(--primary))]"><Heart size={17}/><h2 className="text-lg font-semibold">{t.letterTitle}</h2></div><button onClick={() => { setLetterDraft(''); setEditingMessage(null); setLetterEditor(true); }} className="rounded-lg p-2 text-[hsl(var(--primary))] hover:bg-white/60" aria-label={t.addNote} data-testid="button-add-love-note"><Plus size={16}/></button></div>
                <p className="serif-display min-h-[74px] text-[18px] leading-8 text-[hsl(var(--foreground))]" data-testid="text-love-letter">{dailyLetter}</p>
                {!store.messages.length && <p className="mt-1 text-xs leading-6 text-[hsl(var(--muted-foreground))]">{t.noLetter}</p>}
                {store.messages.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{store.messages.map(message => <div key={message.id} className="flex items-center gap-1 rounded-full border border-[hsl(var(--primary))]/15 bg-white/45 px-2.5 py-1 text-[10px]"><span className="max-w-32 truncate">{message.text}</span><button onClick={() => { setLetterDraft(message.text); setEditingMessage(message.id); setLetterEditor(true); }} aria-label={t.edit} data-testid={`button-edit-message-${message.id}`}><Pencil size={11}/></button><button onClick={() => saveStore(s => ({ ...s, messages: s.messages.filter(x => x.id !== message.id) }))} aria-label={t.delete} data-testid={`button-delete-message-${message.id}`}><X size={12}/></button></div>)}</div>}
              </div>
            </section>
            <section className="soft-card rounded-[24px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-calendar">
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-[hsl(var(--primary))]"/><h2 className="text-lg font-semibold">{t.calendarTitle}</h2></div><div className="flex items-center gap-1"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label={en ? 'Previous month' : 'الشهر السابق'} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[hsl(var(--muted))]" data-testid="button-calendar-previous"><ChevronLeft size={17}/></button><span className="min-w-24 text-center text-xs font-semibold" data-testid="text-calendar-month">{monthLabel}</span><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label={en ? 'Next month' : 'الشهر التالي'} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[hsl(var(--muted))]" data-testid="button-calendar-next"><ChevronRight size={17}/></button></div></div>
              <div className="grid grid-cols-7 gap-y-1 text-center">{weekDays.map((day, i) => <span className="py-2 text-[10px] font-medium text-[hsl(var(--muted-foreground))]" key={`${day}-${i}`}>{day}</span>)}{Array.from({length: firstDay}, (_, i) => <span key={`blank-${i}`} />)}{Array.from({length: daysInMonth}, (_, i) => { const d = i + 1; const isToday = d === Number(dateParts.day) && month.getMonth() === Number(dateParts.month) - 1 && month.getFullYear() === Number(dateParts.year); return <span key={d} className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs ${isToday ? 'bg-[hsl(var(--primary))] font-semibold text-[hsl(var(--primary-foreground))] shadow-sm' : 'text-[hsl(var(--foreground))]'}`} data-testid={`calendar-day-${d}`}>{localizedNumber(d)}</span>; })}</div>
              <p className="mt-3 flex items-center gap-2 border-t border-[hsl(var(--border))]/70 pt-3 text-[10px] text-[hsl(var(--muted-foreground))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]"/>{tr('اليوم', 'Today')} · {dateLabel}</p>
            </section>
          </div>
          <section id="section-settings" className="soft-card mt-6 scroll-mt-6 rounded-[24px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-settings">
            <div className="mb-4 flex items-center gap-2"><Target size={18} className="text-[hsl(var(--primary))]"/><h2 className="text-lg font-semibold">{t.settings}</h2></div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-medium">{tr('لغة التطبيق', 'App language')}</p><p className="mt-1 text-xs leading-6 text-[hsl(var(--muted-foreground))]">{tr('اختاري اللغة التي تناسبكِ.', 'Choose the language that feels right for you.')}</p></div>
              <button onClick={toggleLanguage} className="flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] sm:self-auto" aria-label={en ? 'Switch to Arabic' : 'Switch to English'} data-testid="button-settings-language"><Languages size={16}/><span>{en ? 'العربية' : 'English'}</span></button>
            </div>
            <p className="mt-5 rounded-xl bg-[hsl(var(--muted))]/55 px-4 py-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]" data-testid="text-local-data-note">{tr('بياناتك محفوظة في هذا المتصفح فقط، ولا تُرسل إلى أي مكان.', 'Your data stays in this browser and is not sent anywhere.')}</p>
          </section>
          <footer className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]"><Heart size={12} className="text-[hsl(var(--primary))]"/>{tr('مساحة صغيرة، صُنعت بمحبة لكِ', 'A little space, made with love for you')}</footer>
        </main>
      </div>
      {notice && <div role="status" aria-live="polite" className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[hsl(var(--foreground))] px-5 py-3 text-sm text-[hsl(var(--background))] shadow-xl ${notice === t.timerDone ? 'completion-pop' : ''}`} data-testid="status-notice">{notice}</div>}
      {(editor || letterEditor) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3d2632]/35 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) { setEditor(null); setLetterEditor(false); } }} data-testid="dialog-backdrop">
        <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="w-full max-w-md rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between"><h2 id="dialog-title" className="serif-display text-2xl">{letterEditor ? t.letterTitle : editor?.kind === 'task' ? t.tasksTitle : editor?.kind === 'habit' ? t.habitsTitle : t.examsTitle}</h2><button onClick={() => { setEditor(null); setLetterEditor(false); }} aria-label={t.cancel} data-testid="button-close-dialog" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[hsl(var(--muted))]"><X size={17}/></button></div>
          {letterEditor ? <form onSubmit={saveLetter} className="space-y-4"><textarea autoFocus value={letterDraft} onChange={e => setLetterDraft(e.target.value)} placeholder={t.letterPlaceholder} rows={5} className="w-full resize-none rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-sm leading-7 outline-none focus:border-[hsl(var(--primary))]" data-testid="input-love-letter"/><div className="flex justify-end gap-2"><button type="button" onClick={() => setLetterEditor(false)} className="rounded-xl px-4 py-2 text-sm text-[hsl(var(--muted-foreground))]" data-testid="button-cancel-letter">{t.cancel}</button><button className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-sm font-semibold text-white" data-testid="button-save-letter">{t.save}</button></div></form> :
            <form onSubmit={submitEditor} className="space-y-4">
              <label className="block space-y-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]"><span>{editor?.kind === 'habit' || editor?.kind === 'exam' ? t.name : t.title}</span><input autoFocus value={fields.title} onChange={e => setFields(f => ({...f, title:e.target.value}))} required className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]" data-testid="input-editor-title"/></label>
              {editor?.kind === 'exam' && <label className="block space-y-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]"><span>{t.date}</span><input type="date" value={fields.date} onChange={e => setFields(f => ({...f, date:e.target.value}))} required min={today} className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]" data-testid="input-exam-date"/></label>}
              {editor?.kind === 'task' && <label className="block space-y-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]"><span>{t.priority}</span><select value={fields.priority} onChange={e => setFields(f => ({...f, priority:e.target.value as Task['priority']}))} className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]" data-testid="select-task-priority"><option value="low">{t.low}</option><option value="medium">{t.medium}</option><option value="high">{t.high}</option></select></label>}
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditor(null)} className="rounded-xl px-4 py-2 text-sm text-[hsl(var(--muted-foreground))]" data-testid="button-cancel-editor">{t.cancel}</button><button type="submit" className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-sm font-semibold text-white" data-testid="button-save-editor">{t.save}</button></div>
            </form>}
        </div>
      </div>}
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
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
