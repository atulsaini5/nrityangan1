export type GalleryCursor = { album: number; offset: number };
export type GalleryObject = { name: string; id?: string | null };

// Fill a batch across album boundaries without listing the remaining albums.
// Advance by raw storage objects, so non-image files cannot stall pagination.
export async function nextGalleryBatch(
  albums: string[], cursor: GalleryCursor, size: number,
  list: (album: string, offset: number, limit: number) => Promise<GalleryObject[]>,
) {
  const next = { ...cursor };
  const photos: { album: string; name: string }[] = [];
  while (photos.length < size && next.album < albums.length) {
    const album = albums[next.album];
    const limit = size - photos.length;
    const items = await list(album, next.offset, limit);
    photos.push(...items.filter(item => /\.(avif|gif|jpe?g|png|webp)$/i.test(item.name)).map(item => ({ album, name: item.name })));
    next.offset += items.length;
    if (items.length < limit) { next.album += 1; next.offset = 0; }
  }
  return { photos, cursor: next, hasMore: next.album < albums.length };
}
