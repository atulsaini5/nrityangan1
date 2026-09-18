import { useState } from 'react';
import { Play } from 'lucide-react';

export default function RecitalPromo({ src, poster, year }: { src: string; poster: string; year: string }) {
  const [playing, setPlaying] = useState(false);
  return <section className="mx-auto max-w-6xl px-6 py-12" aria-label="Recital promo">
    <h2 className="font-serif text-3xl">{year} Recital Promo</h2>
    <p className="mb-7 mt-3 text-slate-600">An invitation to an evening of dance and music.</p>
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-slate-950">
      {playing ? <video controls autoPlay playsInline preload="none" poster={poster} src={src} aria-label={`Nrityangan ${year} recital promotional video`} className="aspect-video w-full"><p>Your browser cannot play this video. <a href={src}>Open the promo video</a>.</p></video> : <button onClick={() => setPlaying(true)} aria-label="Play recital promo" className="relative block w-full"><img src={poster} alt={`Preview of the ${year} recital promo`} width="1280" height="720" loading="lazy" decoding="async" className="aspect-video w-full object-contain"/><span className="absolute inset-0 flex items-center justify-center bg-black/20"><Play size={68} className="rounded-full bg-rose-700 p-4 text-white" fill="currentColor"/></span></button>}
    </div>
    <div className="mt-5 flex gap-6 text-rose-700"><a href={src} className="font-medium underline">Open promo video</a>{playing && <button onClick={() => setPlaying(false)} className="underline">Close video</button>}</div>
  </section>;
}
