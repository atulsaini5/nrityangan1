import { useEffect, useMemo, useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { Performance, readPerformances, youtubeId } from '../lib/recitals';

export default function RecitalPerformances({ file }: { file: string }) {
  const [rows, setRows] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(12);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(file, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Performance links could not be loaded. Please try again.');
      setRows(readPerformances(await response.json()));
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [file, retry]);
  const filtered = useMemo(() => rows.filter(row => `${row.artist} ${row.title}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  if (loading) return <p role="status" className="py-12 text-slate-600">Loading performances…</p>;
  if (error) return <p role="alert" className="py-12 text-rose-700">{error} <button className="underline" onClick={() => setRetry(n => n + 1)}>Try again</button></p>;
  if (!rows.length) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8"><h3 className="font-serif text-2xl">The stage, remembered</h3><p className="mt-3 text-slate-600">Artist performances will appear here as recordings become available.</p><a className="mt-5 inline-block font-semibold text-rose-700 underline" href="https://www.youtube.com/@kathakseattle" target="_blank" rel="noopener noreferrer">Visit our YouTube channel</a></div>;
  return <>
    <label className="mb-8 block max-w-md font-medium">Find an artist or performance<input type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(12); setActive(null); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Search performances" /></label>
    <p role="status" className="mb-4 text-sm text-slate-500">{filtered.length} performance{filtered.length === 1 ? '' : 's'}</p>
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice(0, limit).map((row, index) => {
      const id = youtubeId(row.youtubeUrl)!; const key = `${id}-${index}`;
      return <article key={key} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="relative aspect-video bg-slate-900">{active === key ? <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`} title={`${row.artist}: ${row.title}`} width="640" height="360" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 h-full w-full border-0" /> : <button onClick={() => setActive(key)} className="group absolute inset-0 h-full w-full" aria-label={`Play ${row.title} by ${row.artist}`}><img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" width="480" height="360" className="h-full w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-black/20"><Play aria-hidden="true" className="rounded-full bg-rose-700 p-3 text-white group-hover:bg-rose-600" size={56} fill="currentColor" /></span></button>}</div>
        <div className="p-5"><h3 className="font-serif text-xl font-bold">{row.artist}</h3><p className="mt-2 text-slate-600">{row.title}</p><a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-700">Watch on YouTube <ExternalLink size={14}/></a>{active === key && <button className="ml-4 text-sm underline" onClick={() => setActive(null)}>Close player</button>}</div>
      </article>;
    })}</div>
    {limit < filtered.length && <button className="mt-8 rounded-full bg-rose-700 px-6 py-3 text-white" onClick={() => setLimit(n => n + 12)}>Load more performances</button>}
  </>;
}
