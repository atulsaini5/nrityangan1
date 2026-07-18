const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

export const nrityanganImage = (fileName: string) =>
  `${supabaseUrl}/storage/v1/object/public/nrityangan/${encodeURIComponent(fileName)}`;
