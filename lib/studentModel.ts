export type Certification = { academic_year: string; title: string; certificate_name: string };
export type Enrollment = { class_id: string; academic_year: string };
export type Student = {
  contact_name?: string; contact_email?: string; contact_phone?: string; contact_relationship?: string;
  consent_events?: ConsentEvent[];
  id?: string; version?: number; display_name: string; certificate_name: string; aliases: string[];
  current_level: string; status: 'active' | 'inactive'; kind: 'student' | 'guest' | 'instructor';
  needs_review: boolean; notes: string; certifications: Certification[]; enrollments: Enrollment[];
  performances?: { year: string; recital: string; title: string; number?: string; role: string }[];
};
export type ConsentEvent = { id: string; enrollment_id: string; channel: 'email' | 'sms'; decision: 'opted_in' | 'not_opted_in' | 'withdrawn'; destination: string; recorded_at: string; consent_version: string; disclosure_text: string; source: string; evidence: Record<string, unknown> };
export type ClassSession = { id: string; name: string; location: string; schedule: string; instructor: string; level: string; age_group: string };
export const emptyStudent = (): Student => ({ display_name: '', certificate_name: '', aliases: [], current_level: '', status: 'active', kind: 'student', needs_review: false, notes: '', certifications: [], enrollments: [] });
export function validateStudent(value: unknown): asserts value is Student {
  if (!value || typeof value !== 'object') throw new Error('Student is required.');
  const s = value as Student;
  for (const key of ['contact_name','contact_email','contact_phone','contact_relationship'] as const) if(s[key]!==undefined&&(typeof s[key]!=='string'||s[key]!.length>254))throw new Error('Check the contact details.');
  if(s.contact_email&&!/^\S+@[^\s@]+\.[^\s@]+$/.test(s.contact_email))throw new Error('Enter a valid contact email.');
  if(s.contact_phone&&!/^\+[1-9]\d{7,14}$/.test(s.contact_phone))throw new Error('Use a phone number with country code, such as +14255550123.');
  if(s.contact_relationship&&!['self','parent_guardian'].includes(s.contact_relationship))throw new Error('Choose the contact relationship.');
  const text = (v: unknown, max: number, required = false) => typeof v === 'string' && v.length <= max && (!required || v.trim().length > 0);
  const year = (v: unknown) => typeof v === 'string' && /^20\d{2}-\d{2}$/.test(v) && Number(v.slice(-2)) === (Number(v.slice(0, 4)) + 1) % 100;
  if (!text(s.display_name,160,true) || !text(s.certificate_name,160) || !text(s.current_level,200) || !text(s.notes,5000)) throw new Error('Check the name, level and notes.');
  if (!['active','inactive'].includes(s.status) || !['student','guest','instructor'].includes(s.kind) || typeof s.needs_review !== 'boolean') throw new Error('Invalid student status.');
  if (s.id && (!/^[0-9a-f-]{36}$/i.test(s.id) || !Number.isInteger(s.version) || s.version! < 1)) throw new Error('Reload this student before saving.');
  if (!Array.isArray(s.aliases) || s.aliases.length > 50 || s.aliases.some(v => !text(v,160,true))) throw new Error('Check alternate names.');
  if (!Array.isArray(s.certifications) || s.certifications.length > 100 || s.certifications.some(c => !c || !year(c.academic_year) || !text(c.title,200,true) || !text(c.certificate_name,160))) throw new Error('Each certification needs a title and academic year, such as 2025-26.');
  if (!Array.isArray(s.enrollments) || s.enrollments.length > 100 || s.enrollments.some(e => !e || !year(e.academic_year) || !text(e.class_id,80,true))) throw new Error('Each class assignment needs a class and academic year.');
  if (new Set(s.certifications.map(c => `${c.academic_year}:${c.title.trim()}`)).size !== s.certifications.length || new Set(s.enrollments.map(e => `${e.academic_year}:${e.class_id}`)).size !== s.enrollments.length) throw new Error('Remove duplicate certifications or class assignments.');
}
