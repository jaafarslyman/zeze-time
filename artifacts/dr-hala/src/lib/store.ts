export type Task = {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
};

export type Habit = {
  id: string;
  name: string;
  completedDate: string | null;
};

export type Exam = { id: string; name: string; date: string };
export type Session = {
  id: string;
  subject: string;
  duration: number;
  completed: boolean;
  date: string;
};
export type Message = { id: string; text: string };

export type Store = {
  tasks: Task[];
  habits: Habit[];
  exams: Exam[];
  sessions: Session[];
  messages: Message[];
  language: "ar" | "en";
  timerMode: "focus" | "short" | "long";
  remaining: number;
};

export const STORE_KEY = "dr-hala-sanctuary-v1";

export function createInitialStore(): Store {
  return {
    tasks: [],
    habits: [],
    exams: [],
    sessions: [],
    messages: [],
    language: "en",
    timerMode: "focus",
    remaining: 25 * 60,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): value is string {
  return typeof value === "string";
}

export function parseStore(value: unknown): Store {
  const raw = isRecord(value) ? value : {};
  const priorities = new Set(["high", "medium", "low"]);
  const timerModes = new Set(["focus", "short", "long"]);

  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks.flatMap((item): Task[] => {
        if (
          !isRecord(item) ||
          !stringValue(item.id) ||
          !stringValue(item.title) ||
          !priorities.has(String(item.priority)) ||
          typeof item.completed !== "boolean"
        ) {
          return [];
        }
        return [
          {
            id: item.id,
            title: item.title,
            priority: item.priority as Task["priority"],
            completed: item.completed,
          },
        ];
      })
    : [];

  const habits = Array.isArray(raw.habits)
    ? raw.habits.flatMap((item): Habit[] => {
        if (
          !isRecord(item) ||
          !stringValue(item.id) ||
          !stringValue(item.name) ||
          !(item.completedDate === null || stringValue(item.completedDate))
        ) {
          return [];
        }
        return [
          {
            id: item.id,
            name: item.name,
            completedDate: item.completedDate,
          },
        ];
      })
    : [];

  const exams = Array.isArray(raw.exams)
    ? raw.exams.flatMap((item): Exam[] => {
        if (
          !isRecord(item) ||
          !stringValue(item.id) ||
          !stringValue(item.name) ||
          !stringValue(item.date)
        ) {
          return [];
        }
        return [{ id: item.id, name: item.name, date: item.date }];
      })
    : [];

  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.flatMap((item): Session[] => {
        if (
          !isRecord(item) ||
          !stringValue(item.id) ||
          !stringValue(item.subject) ||
          typeof item.duration !== "number" ||
          !Number.isFinite(item.duration) ||
          typeof item.completed !== "boolean" ||
          !stringValue(item.date)
        ) {
          return [];
        }
        return [
          {
            id: item.id,
            subject: item.subject,
            duration: item.duration,
            completed: item.completed,
            date: item.date,
          },
        ];
      })
    : [];

  const messages = Array.isArray(raw.messages)
    ? raw.messages.flatMap((item): Message[] => {
        if (
          !isRecord(item) ||
          !stringValue(item.id) ||
          !stringValue(item.text)
        ) {
          return [];
        }
        return [{ id: item.id, text: item.text }];
      })
    : [];

  return {
    tasks,
    habits,
    exams,
    sessions,
    messages,
    language: raw.language === "ar" ? "ar" : "en",
    timerMode: timerModes.has(String(raw.timerMode))
      ? (raw.timerMode as Store["timerMode"])
      : "focus",
    remaining:
      typeof raw.remaining === "number" && Number.isFinite(raw.remaining)
        ? Math.max(0, Math.min(raw.remaining, 90 * 60))
        : 25 * 60,
  };
}

export function readLocalStore(key: string): Store | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? parseStore(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function writeLocalStore(key: string, value: Store): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
