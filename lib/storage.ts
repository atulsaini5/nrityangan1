const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

const optimizedImages: Record<string, string> = {
  'Begineer-Adult-Teen.png': '/images/beginner-adult-teen-20260905.webp',
  'Int-kids-teen.png': '/images/intermediate-kids-teen-20260905.webp',
  'Int-Teen-Adult.png': '/images/intermediate-teen-adult-20260905.webp',
  'Inter-AdvTeenAdult.png': '/images/advanced-teen-adult-20260905.webp',
  'Momandme.png': '/images/mom-and-me-20260905.webp',
  'stage.png': '/images/stage-20260905.webp',
  'stageold.avif': '/images/stage-hero-20260905.avif',
};

export const nrityanganImage = (fileName: string) => optimizedImages[fileName]
  ?? `${supabaseUrl}/storage/v1/object/public/nrityangan/${encodeURIComponent(fileName)}`;
