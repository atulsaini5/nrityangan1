import { useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, MapPin } from 'lucide-react';
import type { ClassSession, Location } from '../types';
import { CLASS_CATEGORIES } from '../constants';
import { useSchedule } from '../lib/useSchedule';
import {
  ALL_FILTERS, ClassFilters, WEEKDAYS, displayAge, displayClassTitle, displayLevel,
  filterClasses, formatClassTime, groupClasses, sortSessions,
} from '../lib/classDisplay';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2';

function FilterChips({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string; onChange: (value: string) => void;
}) {
  return <fieldset className="min-w-0">
    <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</legend>
    <div className="flex gap-1 overflow-x-auto pb-1">
      {options.map(option => <button key={option} type="button" aria-pressed={selected === option}
        onClick={() => onChange(option)}
        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm ${focus} ${selected === option ? 'border-rose-700 bg-rose-700 font-semibold text-white' : 'border-transparent text-slate-600 hover:border-stone-300 hover:bg-white'}`}>
        {selected === option && <Check size={13} aria-hidden="true" />}{option}
      </button>)}
    </div>
  </fieldset>;
}

function ClassCard({ sessions, locations }: { sessions: ClassSession[]; locations: Location[] }) {
  const [expanded, setExpanded] = useState(false);
  const first = sessions[0];
  const title = displayClassTitle(first.title);
  const description = first.curriculum || CLASS_CATEGORIES.find(c => c.match.title === first.title)?.description;
  const detailsId = `class-details-${first.id}`;
  return <article className="min-w-0 rounded-xl border border-stone-200 bg-white px-4 pb-2 pt-4 shadow-sm sm:px-6 sm:pt-5" aria-label={`${title}, ${displayAge(first.ageGroup)}`}>
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <h2 className="font-serif text-[23px] font-bold leading-tight text-slate-900">{title}</h2>
      <span className="mt-0.5 rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{displayAge(first.ageGroup)}</span>
    </div>
    <p className="mt-1.5 text-xs text-slate-500">{displayLevel(first.level)} · {displayAge(first.ageGroup)}</p>
    {description && <p className="mt-2 truncate text-sm text-slate-600">{description}</p>}
    <ul className="mt-2 divide-y divide-stone-100 sm:mt-3" aria-label="Weekly sessions">
      {sessions.map(session => <li key={session.id} className="grid grid-cols-[2.25rem_5.5rem_minmax(0,1fr)] items-baseline gap-x-2 py-2.5 text-sm" data-session-id={session.id}>
        <abbr title={session.dayOfWeek} className="text-[11px] font-bold uppercase tracking-wide text-rose-800 no-underline">{session.dayOfWeek.slice(0, 3)}</abbr>
        <time dateTime={session.startTime} className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatClassTime(session.startTime)}</time>
        <span className="flex min-w-0 items-start gap-1 text-xs leading-5 text-slate-600"><MapPin size={13} className="mt-1 shrink-0 text-rose-700" aria-hidden="true" />{locations.find(l => l.id === session.locationId)?.name || session.locationId}</span>
      </li>)}
    </ul>
    <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(!expanded)}
      className={`mt-1 flex min-h-11 items-center gap-2 rounded text-sm font-semibold text-rose-800 ${focus}`}>
      {expanded ? 'Hide details' : 'View class'}{expanded ? <ChevronDown size={15} className="rotate-180" aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
      <span className="sr-only"> — {first.title}, {displayAge(first.ageGroup)}</span>
    </button>
    <div id={detailsId} hidden={!expanded} className="border-t border-stone-200 pb-3 pt-3 text-sm text-slate-600">
      <p className="font-medium text-slate-800">{first.title}</p>
      {description && <p className="mt-2 leading-relaxed">{description}</p>}
      <ul className="mt-3 space-y-3">{sessions.map(session => {
        const location = locations.find(l => l.id === session.locationId);
        return <li key={session.id}><p className="font-medium text-slate-800">{session.dayOfWeek} · {formatClassTime(session.startTime)} · {session.durationMinutes} min</p>
          <p>Instructor: {session.instructor}</p><p>{location?.name} {location?.address && `· ${location.address}`}</p></li>;
      })}</ul>
      <a href="/enroll" className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded font-semibold text-rose-800 underline underline-offset-4 ${focus}`}>Open enrollment form <ArrowRight size={15} aria-hidden="true" /></a>
    </div>
  </article>;
}

// Same weekly schedule and chronological ordering, with an agenda layout on small screens.
function CalendarView({ classes, locations }: { classes: ClassSession[]; locations: Location[] }) {
  return <div className="grid gap-3 lg:grid-cols-7 lg:gap-0 lg:divide-x lg:divide-stone-200 lg:rounded-xl lg:border lg:border-stone-200 lg:bg-white" aria-label="Weekly class calendar">
    {WEEKDAYS.map(day => {
      const sessions = sortSessions(classes.filter(session => session.dayOfWeek === day));
      return <section key={day} className={`${sessions.length ? '' : 'hidden lg:block'} min-w-0 rounded-lg border border-stone-200 bg-white p-4 lg:rounded-none lg:border-0 lg:p-3`} aria-label={day}>
        <h2 className="border-b border-stone-200 pb-3 text-xs font-bold uppercase tracking-wider text-slate-700">{day}</h2>
        <ul className="divide-y divide-stone-100">{sessions.map(session => <li key={session.id} className="py-3" data-session-id={session.id}>
          <time dateTime={session.startTime} className="font-semibold tabular-nums text-rose-800">{formatClassTime(session.startTime)}</time>
          <h3 className="mt-1 font-serif text-lg font-bold leading-snug text-slate-900">{displayClassTitle(session.title)}</h3>
          <p className="mt-1 text-xs text-slate-500">{displayAge(session.ageGroup)} · {displayLevel(session.level)}</p>
          <p className="mt-2 flex items-start gap-1 text-xs leading-5 text-slate-600"><MapPin size={12} className="mt-1 shrink-0 text-rose-700" aria-hidden="true" />{locations.find(l => l.id === session.locationId)?.name || session.locationId}</p>
          <p className="mt-1 text-xs text-slate-500">{session.durationMinutes} min</p>
        </li>)}</ul>
        {!sessions.length && <p className="py-6 text-xs text-slate-400">No classes</p>}
      </section>;
    })}
  </div>;
}

export default function ClassesPage() {
  const { classes, locations, error, loading } = useSchedule();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filters, setFilters] = useState<ClassFilters>({ ...ALL_FILTERS });
  const patch = (next: Partial<ClassFilters>) => setFilters(current => ({ ...current, ...next }));
  const filtered = filterClasses(classes, filters);
  const groups = groupClasses(filtered);
  const active = Object.keys(ALL_FILTERS).some(key => filters[key as keyof ClassFilters] !== ALL_FILTERS[key as keyof ClassFilters]);
  const clear = () => setFilters({ ...ALL_FILTERS });
  const selectStyle = `min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-700 ${focus}`;

  return <main className="bg-[#faf9f6] pb-10 sm:pb-12">
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-800">Classes</p>
          <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">Find the right Kathak class</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">Classes for children, teens and adults,<br className="hidden sm:block" /> from beginner through advanced levels.</p></div>
        <img src="/images/stage-hero-20260905.avif" alt="Nrityangan Kathak dancers performing together on stage" width={1600} height={657}
          className="hidden h-36 w-72 rounded-lg object-cover lg:block" />
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
      <section aria-labelledby="find-class-heading" className="border-b border-stone-200 pb-3">
        <h2 id="find-class-heading" className="mb-3 font-serif text-xl font-bold text-slate-900">Find Your Class</h2>
        <div className="grid min-w-0 gap-x-6 gap-y-2 xl:grid-cols-[auto_auto_minmax(0,1fr)]">
          <FilterChips label="Age" options={['All', 'Kids', 'Teens', 'Adults']} selected={filters.age} onChange={age => patch({ age })} />
          <FilterChips label="Level" options={['All Levels', 'Beginner', 'Intermediate', 'Advanced']} selected={filters.level} onChange={level => patch({ level })} />
          <div className="grid min-w-0 grid-cols-2 gap-3 pb-1">
            <label className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">Day<select aria-label="Day" className={`mt-1 font-normal normal-case tracking-normal ${selectStyle}`} value={filters.day} onChange={e => patch({ day: e.target.value })}>
              <option value="">Any Day</option>{WEEKDAYS.filter(day => classes.some(c => c.dayOfWeek === day)).map(day => <option key={day}>{day}</option>)}
            </select></label>
            <label className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">Location<select aria-label="Location" className={`mt-1 font-normal normal-case tracking-normal ${selectStyle}`} value={filters.location} onChange={e => patch({ location: e.target.value })}>
              <option value="">Any Location</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select></label>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
        <div className="flex flex-wrap items-center gap-x-3">
          <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-slate-600">{loading ? 'Loading current schedule…' : error ? 'Schedule unavailable' : <><strong className="font-semibold text-slate-900">{groups.length} {groups.length === 1 ? 'class' : 'classes'} available</strong><span className="ml-2 text-xs">{filtered.length} weekly {filtered.length === 1 ? 'session' : 'sessions'} · Pacific time</span></>}</p>
          {active && <button type="button" onClick={clear} className={`min-h-11 rounded text-sm font-semibold text-rose-800 underline underline-offset-4 ${focus}`}>Clear filters</button>}
        </div>
        <div className="inline-flex rounded-full border border-stone-200 bg-white p-1" role="group" aria-label="Schedule view">
          {[['list', 'Classes'], ['calendar', 'Weekly Calendar']].map(([view, label]) => <button type="button" key={view} aria-pressed={viewMode === view}
            onClick={() => setViewMode(view as 'list' | 'calendar')} className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm ${focus} ${viewMode === view ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-stone-100'}`}>
            {view === 'calendar' && <CalendarDays size={15} aria-hidden="true" />}{label}
          </button>)}
        </div>
      </div>
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-white p-6 text-rose-800">{error}</p>
        : !loading && !filtered.length ? <section className="rounded-xl border border-stone-200 bg-white px-5 py-10 text-center">
          <h2 className="font-serif text-2xl font-bold text-slate-900">{active ? 'No classes match these filters.' : 'No classes are currently published.'}</h2>
          <p className="mt-3 text-sm text-slate-600">{active ? 'Try changing the age, level, day, or location.' : 'Contact the studio for upcoming classes.'}</p>
          {active && <button type="button" onClick={clear} className={`mt-4 min-h-11 rounded-full border border-rose-700 px-5 text-sm font-semibold text-rose-800 ${focus}`}>Clear filters</button>}
        </section> : viewMode === 'list' ? <div className="grid items-start gap-3 sm:gap-4 md:grid-cols-2" aria-label="Available classes">
          {groups.map(group => <ClassCard key={group.key} sessions={group.sessions} locations={locations} />)}
        </div> : <CalendarView classes={filtered} locations={locations} />}
    </div>
  </main>;
}
