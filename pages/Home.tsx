import React from 'react';
import { MapPin, Star, Users, Sparkles, Music, Award, Footprints } from 'lucide-react';
import { nrityanganImage } from '../lib/storage';

const Home: React.FC = () => {
  return (
    <>
    <div className="flex flex-col gap-0">
      {/* Hero Section */}
      <div className="relative h-[80vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={nrityanganImage('stageold.avif')} 
            alt="Kathak Dancer" 
            width={1600}
            height={657}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-transparent" />
        </div>
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="max-w-2xl text-white">
            <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6 animate-in slide-in-from-left duration-700">
              Grace in Motion.<br />
              <span className="text-rose-500">Rhythm in Soul.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200 mb-8 font-light max-w-lg leading-relaxed animate-in slide-in-from-left duration-700 delay-150">
              Experience the ancient art of Kathak. Nrityangan Kathak Studio preserves tradition while inspiring the next generation of artists.
            </p>
            <div className="flex gap-4 animate-in slide-in-from-left duration-700 delay-300">
              <a href="/trial-class" className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-full font-medium transition-all transform hover:scale-105 shadow-lg inline-flex items-center justify-center">
                Book a Trial Class
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-12 -mt-16 relative z-10 max-w-6xl mx-auto rounded-xl shadow-xl grid grid-cols-1 md:grid-cols-3 gap-8 px-8 border border-gray-100">
        <div className="flex items-center space-x-4 p-4">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-full">
            <Star size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Lukhnow Gharana</h3>
            <p className="text-slate-500 text-sm">Affliated Kathak Center</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 p-4 border-t md:border-t-0 md:border-l border-gray-100">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-full">
            <MapPin size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">3 Convenient Locations</h3>
            <p className="text-slate-500 text-sm">Accessible studios near you</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 p-4 border-t md:border-t-0 md:border-l border-gray-100">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Ages 5 to Adult/Senior</h3>
            <p className="text-slate-500 text-sm">Curriculum for every stage</p>
          </div>
        </div>
      </div>

      {/* Offerings Section */}
      <section className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold text-slate-900 mb-4">Our Offerings</h2>
            <div className="w-20 h-1 bg-rose-500 mx-auto rounded-full mb-4"></div>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From first steps to professional stage performance, we nurture every aspect of your Kathak journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Offering 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Footprints size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 mb-3">Beginner Classes</h3>
              <p className="text-slate-600 leading-relaxed">
                Start your Kathak dance journey with our beginner classes, where you’ll learn the basic steps and rhythms.
              </p>
            </div>

            {/* Offering 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Sparkles size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 mb-3">Intermediate</h3>
              <p className="text-slate-600 leading-relaxed">
                Deepen your Kathak skills in our intermediate classes as you improve technique, rhythm, expression, faster footwork, smooth spins, and storytelling.
              </p>
            </div>

            {/* Offering 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Star size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 mb-3">Advanced</h3>
              <p className="text-slate-600 leading-relaxed">
                Elevate your Kathak in our advanced classes with detailed choreography and high-level techniques that sharpen your style and stage presence, with the opportunity to join our performing team.
              </p>
            </div>

             {/* Offering 4 */}
             <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Music size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 mb-3">Choreography Design</h3>
              <p className="text-slate-600 leading-relaxed">
                We create enchanting choreography for you, showcasing your talent and captivating your audience with the grace and expressiveness of Kathak dance.
              </p>
            </div>

             {/* Offering 5 */}
             <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Users size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 mb-3">Stage Performances</h3>
              <p className="text-slate-600 leading-relaxed">
                Once you’re ready, you’ll have opportunities to perform on stage throughout the year and showcase your Kathak skills.
              </p>
            </div>

             {/* Offering 6 */}
             <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Award size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 mb-3">Dance Recital</h3>
              <p className="text-slate-600 leading-relaxed">
                We have an annual recital where you will showcase your talent and earn certification and awards for your Kathak journey.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default Home;
