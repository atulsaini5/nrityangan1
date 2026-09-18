import { useEffect, useRef, useState } from 'react';
import { Camera, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';

export type Archive = {
  photosFile: string;
  programPdf: string; programPages: string[]; announcementPdf: string;
};
type Photo = { src: string; thumbnail: string; small: string; width: number; height: number; alt: string };

function Photos({ file }: { file: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(24);
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(false);
    fetch(file, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Photos unavailable');
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid photo list');
      setPhotos(rows);
    }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [file, retry]);
  useEffect(() => {
    if (selected === null) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [selected]);
  const close = () => { dialog.current?.close(); setSelected(null); };
  const move = (step: number) => setSelected(index => index === null ? null : (index + step + photos.length) % photos.length);
  return <section aria-label="2025 photo gallery">
    <h2 className="font-serif text-3xl">Photo Gallery</h2><p className="mb-7 mt-3 text-slate-600">On stage and behind the scenes at our 2025 celebration.</p>
    {loading && <p role="status">Loading photos…</p>}
    {error && <p role="alert">Photos could not be loaded. <button className="text-rose-700 underline" onClick={() => setRetry(n => n + 1)}>Try again</button></p>}
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{photos.slice(0, limit).map((photo, index) => <button key={photo.src} onClick={() => setSelected(index)} aria-label={`View ${photo.alt}`} className="group overflow-hidden rounded-xl bg-white text-left shadow-sm focus-visible:ring-2 focus-visible:ring-rose-600"><img src={photo.thumbnail} srcSet={`${photo.small} 320w, ${photo.thumbnail} 640w`} sizes="(max-width: 767px) 45vw, 360px" alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"/><span className="block p-3 text-sm text-slate-600">{photo.alt}</span></button>)}</div>
    {limit < photos.length && <button className="mt-6 rounded-full bg-rose-700 px-6 py-3 text-white" onClick={() => setLimit(n => n + 24)}>Load more photos</button>}
    <dialog ref={dialog} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }} aria-label="Recital photo viewer" className="m-auto max-h-[95vh] w-[95vw] max-w-6xl rounded-xl bg-slate-950 p-4 text-white backdrop:bg-black/90">
      {selected !== null && photos[selected] && <><div className="mb-3 flex items-center justify-between gap-4"><p>{photos[selected].alt}</p><button autoFocus onClick={close} aria-label="Close photo" className="rounded-full p-2 hover:bg-white/20"><X/></button></div><img src={photos[selected].src} alt={photos[selected].alt} width={photos[selected].width} height={photos[selected].height} className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"/><div className="mt-4 flex items-center justify-between"><button onClick={() => move(-1)} aria-label="Previous photo" className="p-2"><ChevronLeft/></button><span>{selected + 1} / {photos.length}</span><button onClick={() => move(1)} aria-label="Next photo" className="p-2"><ChevronRight/></button></div></>}
    </dialog>
  </section>;
}

export default function RecitalArchive({ archive }: { archive: Archive }) {
  const [tab, setTab] = useState<'photos' | 'program'>('photos');
  return <section className="mx-auto max-w-7xl px-6 py-12">
    <div className="mb-10 flex flex-wrap gap-3" role="group" aria-label="Explore the 2025 recital">{(['photos', 'program'] as const).map(value => <button key={value} aria-pressed={tab === value} onClick={() => { setTab(value); }} className={`rounded-full border px-5 py-3 font-medium ${tab === value ? 'border-rose-700 bg-rose-700 text-white' : 'border-stone-200 bg-white text-slate-700'}`}>{value === 'photos' ? 'Photo Gallery' : 'Program & Announcement'}</button>)}</div>
    {tab === 'photos' && <Photos file={archive.photosFile}/>}
    {tab === 'program' && <section><h2 className="font-serif text-3xl">Program & Announcement</h2><p className="mt-3 text-slate-600">Sunday, September 21, 2025 · 5:00–9:00 PM · Bellevue Youth Theatre</p><div className="my-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['5:00 PM','Classical dance segment'],['6:30 PM','Guest performances'],['7:00–7:30 PM','Break'],['7:30 PM','Semi-classical dance segment'],['8:00 PM','Award ceremony']].map(([time,label]) => <div key={time} className="rounded-xl border border-stone-200 bg-white p-5"><p className="font-semibold text-rose-700">{time}</p><h3 className="mt-2 font-serif text-xl">{label}</h3></div>)}</div><p className="leading-relaxed text-slate-600">Guest artists: Supratik Chatterjee (tabla), Arya Bhat (sarod), Sampada Bhalerao, Divit and Hamsini Ramanathan (sitar), Apurva Chinchwadkar (flute), and Priya Bondre (classical vocal).</p><div className="my-7 flex flex-wrap gap-4"><a href={archive.programPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-5 py-3 text-white"><Download size={17}/> Open full program (PDF)</a><a href={archive.announcementPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-rose-700 px-5 py-3 text-rose-700"><Download size={17}/> Original announcement (PDF)</a></div><div className="space-y-8">{archive.programPages.map((src,index) => <a key={src} href={src} target="_blank" rel="noopener noreferrer" aria-label={`Open program spread ${index+1} at full size`} className="block"><img src={src} alt={`2025 recital program spread ${index+1}; full program and performer names available in the PDF above`} width="2000" height="1545" loading="lazy" decoding="async" className="w-full rounded-xl border border-stone-200"/></a>)}</div></section>}
    <p className="mt-10 flex items-center gap-2 text-sm text-slate-500"><Camera size={16}/> Nrityangan Kathak Annual Recital 2025</p>
  </section>;
}
