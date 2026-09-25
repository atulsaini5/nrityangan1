import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, ChevronDown, Clock, MapPin, QrCode, Star, Users } from 'lucide-react';
import recitals from '../content/recitals.json';
import { type Agenda, type AgendaItem, readAgenda } from '../lib/agenda';
import AgendaCorrectionForm from '../components/AgendaCorrectionForm';

const agendas = import.meta.glob('../content/agendas/*.json', { import: 'default' });
const reviewUrl = 'https://g.page/r/CdgMmjtVLvLMEAI/review';

function Performance({ item, expanded, toggle }: { item: AgendaItem; expanded: boolean; toggle: () => void }) {
  const panelId = `participants-${item.id}`;
  return <li className="border-b border-stone-100 last:border-0">
    <button id={`performance-${item.id}`} type="button" aria-expanded={expanded} aria-controls={panelId} onClick={toggle}
      className="flex w-full items-center gap-3 px-4 py-5 text-left hover:bg-rose-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rose-700 sm:px-6">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-rose-800">{item.number || '♪'}</span>
      <span className="min-w-0 flex-1"><span className="block font-semibold leading-relaxed text-stone-800">{item.title}</span><span className="mt-1 block text-xs text-stone-500">{expanded ? 'Hide performers' : 'View performers'}</span></span>
      <ChevronDown aria-hidden="true" size={19} className={`shrink-0 text-rose-700 ${expanded ? 'rotate-180' : ''}`}/>
    </button>
    <div id={panelId} aria-labelledby={`performance-${item.id}`} hidden={!expanded} className="bg-stone-50 px-5 pb-5 pt-4 sm:px-6">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-800"><Users size={15} aria-hidden="true"/>Performers</p>
      {item.participants.length ? <ul className="grid gap-2 sm:grid-cols-2">{item.participants.map((name, i) => <li key={`${name}-${i}`} className="break-words rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">{name}</li>)}</ul>
        : <p className="text-sm leading-relaxed text-stone-600">Performer names will be announced soon. Please check back.</p>}
    </div>
  </li>;
}

export default function RecitalAgenda({ year }: { year: string }) {
  const recital = recitals.find(item => item.year === year);
  const loader = recital?.agenda ? agendas[`../content/agendas/${year}.json`] : undefined;
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    let active = true;
    setAgenda(null); setError(''); setExpanded(new Set());
    if (loader) loader().then(data => { if (active) setAgenda(readAgenda(data, year)); }).catch(() => {
      if (active) setError('The agenda could not be loaded. Please try again.');
    });
    return () => { active = false; };
  }, [loader, year, attempt]);
  useEffect(() => {
    const previous = document.title;
    const canonical = document.querySelector('link[rel="canonical"]');
    const description = document.querySelector('meta[name="description"]');
    const oldCanonical = canonical?.getAttribute('href');
    const oldDescription = description?.getAttribute('content');
    document.title = `${recital?.title || 'Recital'} ${year} Agenda | Nrityangan Kathak Studio`;
    canonical?.setAttribute('href', `https://www.kathakseattle.com/recitals/${year}/agenda`);
    description?.setAttribute('content', `Explore the ${year} recital program and performers at Nrityangan Kathak Studio.`);
    return () => {
      document.title = previous;
      if (oldCanonical != null) canonical?.setAttribute('href', oldCanonical);
      if (oldDescription != null) description?.setAttribute('content', oldDescription);
    };
  }, [recital, year]);

  if (!recital || !loader) return <div className="mx-auto max-w-3xl px-6 py-20"><h1 className="font-serif text-3xl">Agenda not available</h1><p className="mt-4">An agenda has not been published for this recital.</p><a className="mt-6 inline-block text-rose-700 underline" href={recital ? `/recitals/${year}` : '/recitals'}>Back to recitals</a></div>;
  const ids = agenda?.sections.flatMap(section => section.items.map(item => item.id)) || [];
  const allExpanded = ids.length > 0 && ids.every(id => expanded.has(id));
  const toggle = (id: string) => setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <div className="min-h-screen bg-[#faf7f2] pb-12">
    <aside aria-label="Review Nrityangan Kathak Studio" className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="flex items-center gap-2 font-semibold text-stone-900"><Star size={18} aria-hidden="true" className="text-amber-700"/>Share your experience</p><p className="mt-1 text-sm leading-relaxed text-stone-700">Leave a Google review for Nrityangan Kathak Studio.</p></div>
        <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#702b3c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#54202d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">Write a Google review<ArrowUpRight size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </aside>
    <header className="bg-[#321415] text-white">
      <div className="mx-auto max-w-4xl px-5 py-9 sm:py-12">
        <a href={`/recitals/${year}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-rose-100 underline-offset-4 hover:underline"><ArrowLeft size={16} aria-hidden="true"/>{year} recital</a>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Nrityangan Kathak Studio · {year}</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-6xl">{recital.title}</h1>
        <p className="mt-3 font-serif text-xl text-amber-100">Your evening at a glance</p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-rose-100">
          <p className="flex items-center gap-2"><CalendarDays size={16} aria-hidden="true"/><time dateTime={recital.date}>{recital.dateLabel}</time></p>
          {agenda && <p className="flex items-center gap-2"><Clock size={16} aria-hidden="true"/>{agenda.time}</p>}
          <p className="flex items-center gap-2"><MapPin size={16} aria-hidden="true"/>{recital.venue}</p>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-4xl px-4 sm:px-5">
      {!agenda && !error && <p role="status" className="py-12">Loading the agenda…</p>}
      {error && <div role="alert" className="my-8 rounded-xl border bg-white p-6"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)} className="mt-4 rounded-full bg-rose-700 px-5 py-3 text-white">Try again</button></div>}
      {agenda && <>
        <nav aria-label="Agenda sections" className="grid grid-cols-2 gap-2 py-6 sm:grid-cols-5">{agenda.sections.map(section => <a key={section.id} href={`#${section.id}`} className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-semibold text-stone-700 hover:border-rose-400"><span className="block">{section.title.replace('Second Half — ', '')}</span><span className="mt-1 block text-xs font-normal text-stone-500">{section.time}</span></a>)}</nav>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-3xl text-stone-900">Evening program</h2><p className="mt-2 text-sm text-stone-600">Tap a performance to see who’s on stage.</p></div><button onClick={() => setExpanded(allExpanded ? new Set() : new Set(ids))} className="min-h-11 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50">{allExpanded ? 'Collapse all' : 'Expand all'}</button></div>
        <div className="space-y-6">{agenda.sections.map(section => <section key={section.id} id={section.id} aria-labelledby={`heading-${section.id}`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className={`px-5 py-5 sm:px-6 ${section.items.length ? 'border-b border-stone-200 bg-[#f2e9e5]' : 'bg-[#efece4]'}`}><p className="text-xs font-bold uppercase tracking-widest text-rose-800">{section.time}</p><h3 id={`heading-${section.id}`} className="mt-2 font-serif text-2xl text-stone-900">{section.title}</h3>{section.description && <p className="mt-2 text-sm text-stone-600">{section.description}</p>}</div>
          {section.items.length > 0 && <ul>{section.items.map(item => <Performance key={item.id} item={item} expanded={expanded.has(item.id)} toggle={() => toggle(item.id)}/>)}</ul>}
        </section>)}</div>
        <p className="mt-5 text-sm text-stone-500">All times are local to Bellevue. Program timings may vary.</p>
      </>}
      <section aria-labelledby="share-agenda" className="mt-10 flex flex-col items-center gap-6 rounded-2xl border border-stone-200 bg-white p-6 sm:flex-row">
        <img src={`/recitals/${year}/agenda-qr.svg`} width="144" height="144" alt={`QR code for the ${year} recital agenda`} className="shrink-0"/>
        <div><h2 id="share-agenda" className="flex items-center gap-2 font-serif text-2xl"><QrCode size={20} aria-hidden="true"/>Share the evening</h2><p className="mt-2 text-sm leading-relaxed text-stone-600">Scan to open this program on another phone.</p><a href={`/recitals/${year}/agenda-qr.png`} download className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-rose-800 underline underline-offset-4">Download QR code</a></div>
      </section>
      {agenda && <AgendaCorrectionForm key={year} agenda={agenda}/>}
    </div>
  </div>;
}
