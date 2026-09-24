export type AgendaItem = { id: string; number?: string; title: string; participants: string[] };
export type AgendaSection = { id: string; title: string; time: string; description?: string; items: AgendaItem[] };
export type Agenda = { year: string; time: string; sections: AgendaSection[] };

// Fail explicitly on malformed content instead of publishing a partial program.
export function readAgenda(value: unknown, year: string): Agenda {
  const agenda = value as Agenda;
  const ids = new Set<string>();
  const validId = (id: unknown) => {
    if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  if (!agenda || agenda.year !== year || !text(agenda.time) || !Array.isArray(agenda.sections) || !agenda.sections.length ||
    agenda.sections.some(section => !section || !validId(section.id) || !text(section.title) || !text(section.time) ||
      (section.description !== undefined && !text(section.description)) || !Array.isArray(section.items) ||
      section.items.some(item => !item || !validId(item.id) || !text(item.title) ||
        (item.number !== undefined && !text(item.number)) || !Array.isArray(item.participants) || !item.participants.every(text)))) {
    throw new Error('The agenda could not be loaded. Please try again.');
  }
  return agenda;
}
