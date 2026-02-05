export interface User {
  id: string;
  name: string;
  role: 'student' | 'parent' | 'admin';
  email: string;
  enrolledClasses: string[]; // Class IDs
}

export interface ClassSession {
  id: string;
  title: string;
  instructor: string;
  locationId: string;
  dayOfWeek: string;
  startTime: string; // "16:00"
  durationMinutes: number;
  ageGroup: string;
  level: string;
  curriculum?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  image: string;
}

export interface Video {
  id: string;
  title: string;
  classId: string;
  date: string;
  thumbnailUrl: string;
  duration: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string
  type: 'class' | 'rehearsal' | 'performance' | 'holiday';
}

export interface TuitionItem {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
}

export interface ClassCategory {
  id: string;
  title: string;
  age: string;
  image: string;
  description: string;
  match: {
    title: string;
    ageGroup?: string;
  };
}