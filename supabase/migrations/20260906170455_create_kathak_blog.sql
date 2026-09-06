-- Additive migration: existing gallery, website images and admin access remain unchanged.
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 160),
  excerpt text not null check (length(btrim(excerpt)) between 1 and 320),
  content text not null check (length(btrim(content)) between 1 and 50000),
  author text not null check (length(btrim(author)) between 1 and 120),
  image_path text not null default '',
  thumbnail_path text not null default '',
  image_alt text not null default '',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_blog_has_cover check (not published or (published_at is not null and image_path <> '' and thumbnail_path <> '' and image_alt <> ''))
);
alter table public.blog_posts enable row level security;
revoke all on public.blog_posts from public, anon, authenticated;
grant select, insert, update on public.blog_posts to service_role;
create index blog_posts_published_date_idx on public.blog_posts (published_at desc, id desc) where published;
create index blog_posts_updated_date_idx on public.blog_posts (updated_at desc, id desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 1048576, array['image/webp']);

-- A broad pre-existing permissive policy must not grant access to this new bucket.
-- Restrictive predicates are true for every other bucket; their existing rules still apply.
create policy blog_images_no_client_insert on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id <> 'blog-images');
create policy blog_images_no_client_update on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'blog-images') with check (bucket_id <> 'blog-images');
create policy blog_images_no_client_delete on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'blog-images');

-- Seed a draft. scripts/publish-welcome.mjs uploads the prepared portrait before publishing.
insert into public.blog_posts (id, slug, title, excerpt, content, author, image_alt)
values (
  'a52db619-cc72-46ea-a8ef-97077f6c0a66',
  'where-the-ghungroo-lead-me',
  'Where the Ghungroo Lead Me',
  'A welcome from Chandrayee: reflections on a life in Kathak, gratitude to her gurus, and an invitation to keep learning, listening, and dancing together.',
  replace($welcome$Namaskar, and welcome to my little corner of Nrityangan.

Before a story becomes a movement, there is a moment of listening. To the music. To the rhythm beneath it. To whatever the heart is trying to say.

This journal is my space to listen a little more closely, and to share my Kathak journey with you.

## A journey that keeps unfolding

Nearly thirty years ago, I founded Nrityangan Kathak Studio. Since then, teaching, mentoring, and conducting workshops for students of all ages have been a beautiful part of my life. Yet the longer I stay with dance, the more I feel there is still to discover.

There is the discipline of returning to a movement until it begins to feel natural. There is the patience of starting again. And there is the joy of seeing someone find a little more confidence through dance.

For me, these moments belong to the Kathak journey just as much as a performance does.

## With gratitude to my gurus

I have had the privilege of learning from Parimal Kishan Ji, Pandit Birju Maharaj Ji, Smt. Saraswati Sen, Smt. Vandana Sen, Pandit Chitresh Das Ji, Saroj Khan Ji, and Kakuli Mukherjee.

I carry deep gratitude for the opportunity to learn from them. To be a teacher is also to remain a student: curious, attentive, and willing to return to the basics with humility.

> The journey does not end when we learn the steps. It opens as we learn to listen.

## From the classroom to the stage

Over the years, my troupe and I have shared our dance at events including IACA, IAWW, Art and Heritage, Northwest Folklife, City of Seattle, Ethnic Heritage, and Utsav. My work has also taken me into judging dance competitions and talent shows, including Dance USA Dance, and teaching with Vibes.

These experiences remind me how many ways dance can bring people together. Tradition gives us a foundation. Our own expression gives us a way to speak from it.

That meeting of tradition and creativity is close to my heart, and it is part of what I hope to nurture at Nrityangan.

## A space to share, and to grow

Here, I hope to share reflections from teaching and practice, thoughts on expression and storytelling, and glimpses of the journey beyond the stage. Some entries may celebrate a performance. Others may simply linger with a question that stayed with me after class.

Whether you are tying your ghungroo for the first time, returning to dance after a pause, or simply curious about Kathak, you are welcome here.

Bring your curiosity. Bring your questions. There is room for all of us to keep learning.

With warmth and gratitude,

**Chandrayee Bhattacharyya**

Founder & Director, Nrityangan Kathak Studio$welcome$, chr(13), ''),
  'Chandrayee Bhattacharyya',
  'Chandrayee Bhattacharyya, founder and artistic director of Nrityangan Kathak Studio'
);
