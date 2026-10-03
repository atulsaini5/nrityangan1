import type { ClassSession } from '../types';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export type ClassFilters = { age: string; level: string; day: string; location: string };
export const ALL_FILTERS: ClassFilters = { age: 'All', level: 'All Levels', day: '', location: '' };

// Display-only correction for a spelling already present in the catalogue.
const normalizeSpelling = (value: string) => value.replace(/\bbegineer\b/gi, 'Beginner');

export function displayClassTitle(title: string) {
  const clean = normalizeSpelling(title).trim().replace(/^Kathak\s+/i, '')
    .replace(/\s+(Kids(?:\s*\/\s*Teens?)?|Teens?(?:\s*\/\s*Adults?)?|Adults?)$/i, '');
  if (/^(Beginner|Intermediate|Advanced)(\s*[-/]\s*(Beginner|Intermediate|Advanced))*$/i.test(clean)) {
    return `${clean.replace(/\s*[-/]\s*/g, ' / ')} Kathak`;
  }
  return title;
}

export function displayAge(age: string) {
  const clean = age.trim();
  const range = clean.match(/^(?:ages?\s*)?(\d+)\s*[-–]\s*(\d+)$/i);
  if (range) return `Ages ${range[1]}–${range[2]}`;
  if (/all ages/i.test(clean)) return 'All ages';
  const groups = [['Kids', /kids?|children/i], ['Teens', /teens?/i], ['Adults', /adults?/i]] as const;
  const matching = groups.filter(([, pattern]) => pattern.test(clean)).map(([label]) => label);
  return matching.length ? matching.join(' + ') : clean;
}

export function matchesAge(value: string, age: string) {
  if (age === 'All' || /all ages/i.test(value)) return true;
  const range = value.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    const min = Number(range[1]), max = Number(range[2]);
    return age === 'Kids' ? min <= 12 : age === 'Teens' ? min <= 17 && max >= 13 : max >= 18;
  }
  return displayAge(value).split(' + ').includes(age);
}

export function displayLevel(level: string) {
  return normalizeSpelling(level).replace(/\s*[-/]\s*/g, ' / ');
}

export function filterClasses(classes: ClassSession[], filters: ClassFilters) {
  return classes.filter(session => matchesAge(session.ageGroup, filters.age)
    && (filters.level === 'All Levels' || displayLevel(session.level).toLowerCase().split(/\s*\/\s*/).includes(filters.level.toLowerCase()))
    && (!filters.day || session.dayOfWeek === filters.day)
    && (!filters.location || session.locationId === filters.location));
}

export function sortSessions(sessions: ClassSession[]) {
  return [...sessions].sort((a, b) => WEEKDAYS.indexOf(a.dayOfWeek) - WEEKDAYS.indexOf(b.dayOfWeek)
    || a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
}

export function groupClasses(classes: ClassSession[]) {
  const groups = new Map<string, ClassSession[]>();
  for (const session of classes) {
    // Keep differently named or described records distinct; never discard a session.
    const key = JSON.stringify([session.title, session.ageGroup, session.level, session.curriculum || '']);
    groups.set(key, [...(groups.get(key) || []), session]);
  }
  return [...groups.entries()].map(([key, sessions]) => ({ key, sessions: sortSessions(sessions) }));
}

export function formatClassTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}
