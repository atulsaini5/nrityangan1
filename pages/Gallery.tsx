import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon, Play, X, Youtube } from 'lucide-react';

type StorageObject = { name: string; id?: string | null; metadata?: { mimetype?: string } | null };
type GalleryImage = { name: string; url: string };
type GalleryCollection = { name: string; title: string; images: GalleryImage[] };
type YouTubeVideo = { id: string; title: string; publishedAt: string; thumbnail: string; url: string };

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const imagePattern = /\.(avif|gif|jpe?g|png|webp)$/i;
const PAGE_SIZE = 24;
const listingCache = new Map<string, { expires: number; items: StorageObject[] }>();

const optimizedUrl = (url: string, width: number) =>
  `/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;

const GalleryPhoto = ({ image, large = false }: { image: GalleryImage; large?: boolean }) => {
  const [fallback, setFallback] = useState(false);
  return <img
    src={fallback ? image.url : optimizedUrl(image.url, large ? 1600 : 640)}
    srcSet={fallback || large ? undefined : `${optimizedUrl(image.url, 320)} 320w, ${optimizedUrl(image.url, 640)} 640w`}
    sizes={large ? undefined : '(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 304px'}
    alt={image.name.replace(/[-_]/g, ' ')} width={large ? 1600 : 640} height={large ? 1200 : 480}
    loading={large ? 'eager' : 'lazy'} decoding="async"
    onError={() => setFallback(true)}
    className={large ? 'max-h-[88vh] max-w-[88vw] object-contain' : 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'}
  />;
};

const displayTitle = (name: string) =>
  name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

const publicUrl = (path: string) =>
  `${supabaseUrl}/storage/v1/object/public/gallery/${path.split('/').map(encodeURIComponent).join('/')}`;

async function listObjects(prefix: string, offset = 0, limit = PAGE_SIZE, signal?: AbortSignal): Promise<StorageObject[]> {
  const cacheKey = `${prefix}:${offset}:${limit}`;
  const cached = listingCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.items;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/list/gallery`, {
    signal,
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix, limit, offset, sortBy: { column: 'name', order: 'asc' } }),
  });

  if (!response.ok) throw new Error(`Gallery request failed (${response.status})`);
  const items: StorageObject[] = await response.json();
  listingCache.set(cacheKey, { items, expires: Date.now() + 300000 });
  return items;
}

const Gallery: React.FC = () => {
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<'photos' | 'videos'>('photos');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoAttempted, setVideoAttempted] = useState(false);
  const [albums, setAlbums] = useState<string[]>([]);
  const [album, setAlbum] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadGallery = async () => {
      if (!supabaseUrl || !anonKey) {
        setError('The gallery is not configured yet. Please check back soon.');
        setLoading(false);
        return;
      }

      try {
        const rootItems: StorageObject[] = [];
        let batch: StorageObject[];
        do {
          batch = await listObjects('', rootItems.length, 100, controller.signal);
          rootItems.push(...batch);
        } while (batch.length === 100);
        const folders = rootItems.filter(item => !item.id && !imagePattern.test(item.name)).map(item => item.name).sort((a, b) => b.localeCompare(a));
        if (!cancelled) {
          setAlbums(folders);
          setAlbum(folders[0] || '');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load the gallery.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadGallery();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  useEffect(() => {
    if (!album) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setCollections([]);
    setSelectedUrl(null);
    setHasMore(false);
    listObjects(album, page * PAGE_SIZE, PAGE_SIZE, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setCollections([{ name: album, title: displayTitle(album), images: items.filter(item => imagePattern.test(item.name)).map(item => ({ name: item.name, url: publicUrl(`${album}/${item.name}`) })) }]);
      setHasMore(items.length === PAGE_SIZE);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load photos.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [album, page, retry]);

  useEffect(() => {
    if (tab !== 'videos' || videoAttempted) return;
    const loadVideos = async () => {
      setVideoLoading(true);
      setVideoAttempted(true);
      setVideoError('');
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/youtube-videos`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load videos');
        setVideos(result.videos ?? []);
      } catch (err) {
        setVideoError(err instanceof Error ? err.message : 'Unable to load videos');
      } finally {
        setVideoLoading(false);
      }
    };
    loadVideos();
  }, [tab, videoAttempted]);

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
        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button onClick={() => setTab('photos')} className={`flex items-center gap-2 rounded-full px-6 py-3 font-medium transition ${tab === 'photos' ? 'bg-rose-600 text-white shadow' : 'text-slate-600 hover:text-rose-600'}`}><ImageIcon size={18}/> Photos</button>
            <button onClick={() => setTab('videos')} className={`flex items-center gap-2 rounded-full px-6 py-3 font-medium transition ${tab === 'videos' ? 'bg-red-600 text-white shadow' : 'text-slate-600 hover:text-red-600'}`}><Youtube size={19}/> Videos</button>
          </div>
        </div>
        {tab === 'photos' && loading && <p className="py-20 text-center text-slate-500">Loading photos...</p>}
        {tab === 'photos' && albums.length > 0 && <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <label htmlFor="gallery-album" className="font-medium text-slate-700">Choose an album</label>
          <select id="gallery-album" value={album} onChange={event => { setAlbum(event.target.value); setPage(0); }} className="max-w-full rounded-lg border border-slate-300 bg-white px-4 py-3">
            {albums.map(name => <option key={name} value={name}>{displayTitle(name)}</option>)}
          </select>
        </div>}
        {tab === 'photos' && error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">{error}{album && <button onClick={() => setRetry(value => value + 1)} className="ml-4 underline">Try again</button>}</div>}
        {tab === 'photos' && !loading && !error && collections.length === 0 && <p className="py-20 text-center text-slate-500">No gallery photos are available yet.</p>}

        {tab === 'photos' && <div className="space-y-14">
          {collections.map(collection => (
            <section key={collection.name}>
              <div className="mb-6 flex items-end justify-between border-b border-rose-200 pb-3">
                <h2 className="font-serif text-2xl font-bold text-slate-900">{collection.title}</h2>
                <span className="text-sm text-slate-500">Page {page + 1} · {collection.images.length} photos</span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {collection.images.map(image => (
                  <button key={image.url} onClick={() => setSelectedUrl(image.url)} className="group aspect-[4/3] overflow-hidden rounded-xl bg-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2" aria-label={`View ${image.name}`}>
                    <GalleryPhoto key={image.url} image={image} />
                  </button>
                ))}
              </div>
            </section>
          ))}
          {album && <nav aria-label="Photo pages" className="flex items-center justify-center gap-6">
            <button disabled={loading || page === 0} onClick={() => setPage(value => value - 1)} className="rounded-full border border-slate-300 px-6 py-3 disabled:opacity-40">Previous photos</button>
            <span aria-live="polite">Page {page + 1}</span>
            <button disabled={loading || !hasMore} onClick={() => setPage(value => value + 1)} className="rounded-full bg-rose-600 px-6 py-3 text-white disabled:opacity-40">Next photos</button>
          </nav>}
        </div>}

        {tab === 'videos' && <section>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="font-serif text-2xl font-bold text-slate-900">YouTube Videos</h2><p className="mt-1 text-slate-500">All public uploads from Nrityangan Kathak Studio.</p></div>
            <a href="https://www.youtube.com/@kathakseattle" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700">Visit channel <ExternalLink size={16}/></a>
          </div>
          {videoLoading && <p className="py-20 text-center text-slate-500">Loading YouTube videos...</p>}
          {videoError && <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{videoError} <button className="underline" onClick={() => setVideoAttempted(false)}>Try again</button></p>}
          {!videoLoading && !videoError && !videos.length && <p className="py-20 text-center text-slate-500">No public videos are available yet.</p>}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-video overflow-hidden bg-slate-200">
                <img src={video.thumbnail} alt={video.title} width={1280} height={720} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/25"><span className="rounded-full bg-red-600 p-4 text-white shadow-lg"><Play size={24} fill="currentColor"/></span></span>
              </div>
              <div className="p-5"><h3 className="line-clamp-2 font-semibold text-slate-900">{video.title}</h3><p className="mt-2 text-sm text-slate-500">{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : 'Watch on YouTube'}</p></div>
            </a>)}
          </div>
        </section>}
      </div>

      {selectedUrl && selectedIndex >= 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setSelectedUrl(null)}>
          <button onClick={() => setSelectedUrl(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close"><X size={28} /></button>
          <button onClick={event => { event.stopPropagation(); move(-1); }} className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous photo"><ChevronLeft size={32} /></button>
          <div onClick={event => event.stopPropagation()}><GalleryPhoto key={selectedUrl} image={allImages[selectedIndex]} large /></div>
          <button onClick={event => { event.stopPropagation(); move(1); }} className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next photo"><ChevronRight size={32} /></button>
        </div>
      )}
    </div>
  );
};

export default Gallery;


