import React from 'react';
import { ArrowRight, CheckCircle2, Clock, MapPin, Sparkles, Users } from 'lucide-react';
import TrialClassForm from '../components/TrialClassForm';
import { CLASSES, LOCATIONS } from '../constants';
import { nrityanganImage } from '../lib/storage';

type LandingPageKind = 'kids-bellevue' | 'redmond' | 'adult-bellevue' | 'trial';

interface LandingPageProps {
  kind: LandingPageKind;
}

const formatTime = (time: string) => {
  const [hoursValue, minutes] = time.split(':').map(Number);
  const period = hoursValue >= 12 ? 'PM' : 'AM';
  const hours = hoursValue % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const PAGE_COPY: Record<Exclude<LandingPageKind, 'trial'>, {
  eyebrow: string;
  title: string;
  intro: string;
  locationIds: string[];
  audience: 'kids' | 'adult' | 'all';
  image: string;
  imageAlt: string;
}> = {
  'kids-bellevue': {
    eyebrow: 'Bellevue • Ages 5–12',
    title: 'Kids Kathak Classes in Bellevue',
    intro: 'Help your child build rhythm, posture, confidence, and a meaningful connection to Indian classical dance in a supportive class setting.',
    locationIds: ['loc1', 'loc3'],
    audience: 'kids',
    image: 'Begineer-Kids.jpg',
    imageAlt: 'Children learning Kathak dance at Nrityangan',
  },
  redmond: {
    eyebrow: 'Redmond • Kids, teens and adults',
    title: 'Kathak Classes in Redmond',
    intro: 'Learn the footwork, rhythm, spins, expression, and storytelling of Kathak with weekly classes at SaiBaba Temple in Redmond.',
    locationIds: ['loc2'],
    audience: 'all',
    image: 'stageold.avif',
    imageAlt: 'Nrityangan Kathak dancers performing on stage',
  },
  'adult-bellevue': {
    eyebrow: 'Bellevue • Teen and adult programs',
    title: 'Adult Kathak Classes in Bellevue',
    intro: 'Begin or deepen your Kathak practice through structured training in technique, rhythm, expression, footwork, and graceful spins.',
    locationIds: ['loc1', 'loc3'],
    audience: 'adult',
    image: 'Begineer-Adult-Teen.png',
    imageAlt: 'Teen and adult Kathak students at Nrityangan',
  },
};

const getRelevantClasses = (kind: Exclude<LandingPageKind, 'trial'>) => {
  const page = PAGE_COPY[kind];
  return CLASSES.filter((classSession) => {
    const atLocation = page.locationIds.includes(classSession.locationId);
    if (page.audience === 'kids') return atLocation && /Kids/i.test(classSession.ageGroup);
    if (page.audience === 'adult') return atLocation && /Adult|All Ages/i.test(classSession.ageGroup);
    return atLocation;
  });
};

const TrialPage = () => (
  <div className="bg-rose-50/50">
    <section className="bg-slate-900 px-4 py-16 text-center text-white sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-300">Meet the studio</p>
      <h1 className="mx-auto mt-3 max-w-3xl font-serif text-4xl font-bold sm:text-6xl">Book a Kathak Trial Class</h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">Choose the class and location that interest you. We will contact you to confirm the best available session.</p>
    </section>
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <div>
        <h2 className="font-serif text-3xl font-bold text-slate-900">Your first step into Kathak</h2>
        <p className="mt-4 leading-relaxed text-slate-600">Nrityangan welcomes students from age 5 through adulthood, from complete beginners to experienced dancers.</p>
        <ul className="mt-7 space-y-4 text-slate-700">
          {['Classes in Bellevue and Redmond', 'Programs for kids, teens, adults, and seniors', 'Traditional technique, rhythm, expression, and storytelling'].map((item) => (
            <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-rose-600" size={20} /><span>{item}</span></li>
          ))}
        </ul>
        <a href="/#/classes" className="mt-8 inline-flex items-center gap-2 font-semibold text-rose-700 hover:text-rose-800">See the full class schedule <ArrowRight size={18} /></a>
      </div>
      <TrialClassForm mode="inline" />
    </section>
  </div>
);

const LocationIntentPage: React.FC<{ kind: Exclude<LandingPageKind, 'trial'> }> = ({ kind }) => {
  const page = PAGE_COPY[kind];
  const classes = getRelevantClasses(kind);
  const locations = LOCATIONS.filter((location) => page.locationIds.includes(location.id));

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-slate-950">
        <img src={nrityanganImage(page.image)} alt={page.imageAlt} className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-300">{page.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-6xl">{page.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-200 sm:text-xl">{page.intro}</p>
          <a href="/trial-class" className="mt-8 inline-flex items-center gap-2 rounded-full bg-rose-600 px-7 py-3.5 font-semibold text-white shadow-lg transition hover:bg-rose-700">Book a trial class <ArrowRight size={18} /></a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">Current weekly options</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-slate-900">Find a class that fits</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {classes.map((classSession) => {
                const location = LOCATIONS.find((item) => item.id === classSession.locationId);
                return (
                  <article key={classSession.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="font-serif text-xl font-bold text-slate-900">{classSession.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{classSession.curriculum}</p>
                    <div className="mt-5 space-y-2 text-sm text-slate-700">
                      <p className="flex items-center gap-2"><Users size={16} className="text-rose-600" /> {classSession.ageGroup} • {classSession.level}</p>
                      <p className="flex items-center gap-2"><Clock size={16} className="text-rose-600" /> {classSession.dayOfWeek}s at {formatTime(classSession.startTime)}</p>
                      <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-rose-600" /> {location?.name}, {location?.address}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <aside className="rounded-3xl bg-rose-50 p-7">
            <Sparkles className="text-rose-600" size={28} />
            <h2 className="mt-4 font-serif text-2xl font-bold text-slate-900">What students learn</h2>
            <ul className="mt-5 space-y-3 text-slate-700">
              {['Foundational posture and movement', 'Rhythmic footwork and spins', 'Hand gestures and expression', 'Compositions and storytelling', 'Opportunities for stage performance'].map((item) => (
                <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-rose-600" size={18} /><span>{item}</span></li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="bg-slate-900 px-4 py-14 text-center text-white">
        <h2 className="font-serif text-3xl font-bold">Ready to experience a class?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">Tell us your age, preferred class, and location. We will help identify the best session.</p>
        <a href="/trial-class" className="mt-7 inline-flex items-center gap-2 rounded-full bg-rose-600 px-7 py-3.5 font-semibold hover:bg-rose-700">Request a trial class <ArrowRight size={18} /></a>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-serif text-2xl font-bold text-slate-900">Class locations</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {locations.map((location) => (
            <div key={location.id} className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">{location.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{location.address}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ kind }) => kind === 'trial' ? <TrialPage /> : <LocationIntentPage kind={kind} />;

export default LandingPage;
