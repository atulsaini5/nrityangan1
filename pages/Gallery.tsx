import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';

type StorageObject = { name: string; id?: string | null; metadata?: { mimetype?: string } | null };
type GalleryImage = { name: string; url: string };
type GalleryCollection = { name: string; title: string; images: GalleryImage[] };

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const imagePattern = /\.(avif|gif|jpe?g|png|webp)$/i;

const displayTitle = (name: string) =>
  name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

const publicUrl = (path: string) =>
  `${supabaseUrl}/storage/v1/object/public/gallery/${path.split('/').map(encodeURIComponent).join('/')}`;

async function listObjects(prefix: string): Promise<StorageObject[]> {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/list/gallery`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });

  if (!response.ok) throw new Error(`Gallery request failed (${response.status})`);
  return response.json();
}

const Gallery: React.FC = () => {
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadGallery = async () => {
      if (!supabaseUrl || !anonKey) {
        setError('The gallery is not configured yet. Please check back soon.');
        setLoading(false);
        return;
      }

      try {
        const rootItems = await listObjects('');
        const folders = rootItems.filter(item => !item.id && !imagePattern.test(item.name));
        const loaded = await Promise.all(folders.map(async folder => {
          const items = await listObjects(folder.name);
          const images = items
            .filter(item => imagePattern.test(item.name))
            .map(item => ({ name: item.name, url: publicUrl(`${folder.name}/${item.name}`) }));
          return { name: folder.name, title: displayTitle(folder.name), images };
        }));

        if (!cancelled) {
          setCollections(loaded.filter(collection => collection.images.length > 0).sort((a, b) => b.name.localeCompare(a.name)));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load the gallery.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadGallery();
    return () => { cancelled = true; };
  }, []);

  const allImages = useMemo(() => collections.flatMap(collection => collection.images), [collections]);
  const selectedIndex = selectedUrl ? allImages.findIndex(image => image.url === selectedUrl) : -1;

  useEffect(() => {
    if (!selectedUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedUrl(null);
      if (event.key === 'ArrowLeft' && allImages.length) setSelectedUrl(allImages[(selectedIndex - 1 + allImages.length) % allImages.length].url);
      if (event.key === 'ArrowRight' && allImages.length) setSelectedUrl(allImages[(selectedIndex + 1) % allImages.length].url);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedUrl, selectedIndex, allImages]);

  const move = (direction: number) => {
    if (!allImages.length) return;
    setSelectedUrl(allImages[(selectedIndex + direction + allImages.length) % allImages.length].url);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <section className="bg-slate-900 px-4 py-16 text-center text-white">
        <ImageIcon className="mx-auto mb-4 text-rose-400" size={36} />
        <h1 className="font-serif text-4xl font-bold">Gallery</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-300">Moments from our performances, workshops, and Kathak community through the years.</p>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {loading && <p className="py-20 text-center text-slate-500">Loading galleryâ€¦</p>}
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">{error}</p>}
        {!loading && !error && collections.length === 0 && <p className="py-20 text-center text-slate-500">No gallery photos are available yet.</p>}

        <div className="space-y-14">
          {collections.map(collection => (
            <section key={collection.name}>
              <div className="mb-6 flex items-end justify-between border-b border-rose-200 pb-3">
                <h2 className="font-serif text-2xl font-bold text-slate-900">{collection.title}</h2>
                <span className="text-sm text-slate-500">{collection.images.length} photos</span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {collection.images.map(image => (
                  <button key={image.url} onClick={() => setSelectedUrl(image.url)} className="group aspect-[4/3] overflow-hidden rounded-xl bg-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2" aria-label={`View ${image.name}`}>
                    <img src={image.url} alt={image.name.replace(/[-_]/g, ' ')} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {selectedUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setSelectedUrl(null)}>
          <button onClick={() => setSelectedUrl(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close"><X size={28} /></button>
          <button onClick={event => { event.stopPropagation(); move(-1); }} className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous photo"><ChevronLeft size={32} /></button>
          <img src={selectedUrl} alt="Gallery preview" className="max-h-[88vh] max-w-[88vw] object-contain" onClick={event => event.stopPropagation()} />
          <button onClick={event => { event.stopPropagation(); move(1); }} className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next photo"><ChevronRight size={32} /></button>
        </div>
      )}
    </div>
  );
};

export default Gallery;

