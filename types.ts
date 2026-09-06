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