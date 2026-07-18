import React from 'react';
import { Star, Award, Users, Globe } from 'lucide-react';
import { nrityanganImage } from '../lib/storage';

const About: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative py-24 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
             <img src={nrityanganImage('stage.png')} alt="Kathak performance" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-white mb-6">About Nrityangan</h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            A sanctuary for dance, where the ancient traditions of Kathak meet contemporary expression.
          </p>
        </div>
      </div>

      {/* Intro Section */}
      <section className="py-16 max-w-4xl mx-auto px-4 text-center">
        <h2 className="font-serif text-3xl font-bold text-slate-900 mb-6">Indian Classical Kathak Dance</h2>
        <div className="w-24 h-1 bg-rose-500 mx-auto mb-8 rounded-full"></div>
        <p className="text-lg text-slate-600 leading-relaxed">
          Nrityangan Kathak Studio is dedicated to preserving and promoting the rich tradition of Indian classical Kathak dance. We offer classes for all levels, where students can immerse themselves in the graceful movements and storytelling aspects of Kathak. Our studio provides a vibrant space for students to enhance their technique and express themselves through this beautiful art form.
        </p>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-rose-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1">
               <div className="absolute -inset-4 bg-white rounded-2xl transform -rotate-2 shadow-lg"></div>
               <img 
                 src={nrityanganImage('Int-Teen-Adult.png')} 
                 alt="Classroom" 
                 className="relative rounded-2xl shadow-xl w-full h-96 object-cover"
               />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-serif text-3xl font-bold text-slate-900 mb-6">Our Mission</h2>
              <div className="space-y-6 text-slate-700 leading-relaxed text-lg">
                <p>
                  At Nrityangan Kathak Studio, our mission is to share the enchanting beauty and cultural heritage of Kathak dance with everyone. We strive to create a nurturing environment where students can explore the intricacies of this classical dance form, build confidence, and connect with their emotions through expressive movements.
                </p>
                <p>
                  Through our classes, we aim to empower individuals to embrace the artistic and spiritual dimensions of Kathak, improve their physical well-being, and experience the sheer joy of dancing to traditional Indian music. Join us on this enriching journey of self-discovery and cultural immersion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliation Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <Globe size={200} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/20">
                <img src={nrityanganImage('ham.png')} alt="Hindusthan Art & Music Society" className="h-16 w-16 object-contain" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold mb-4">Our Affiliation</h3>
                <p className="text-slate-300 mb-6 text-lg max-w-2xl">
                  Nrityangan Kathak Academy is registered with Hindusthan Art & Music Society (HAMS). It also runs a Global Examination Board of Indian Art & Culture. Our curriculum, exam and certification is through Hindustan art and music society.
                </p>
                <a 
                  href="https://hamsociety.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-rose-400 font-bold hover:text-white transition-colors border-b-2 border-rose-400 hover:border-white pb-1"
                >
                  Visit HAMS Website <Globe size={16} />
                </a>
              </div>
            </div>
         </div>
      </section>

      {/* Artistic Director Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
             <h2 className="font-serif text-4xl font-bold text-slate-900">Artistic Director</h2>
             <div className="w-16 h-1 bg-rose-500 mx-auto mt-4 rounded-full"></div>
           </div>
           
           <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row">
             <div className="lg:w-2/5 relative min-h-[400px]">
               <img 
                src={nrityanganImage('Chandrayee.jpeg')} 
                alt="Chandrayee Bhattacharyya" 
                className="absolute inset-0 w-full h-full object-cover" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8 lg:hidden">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Chandrayee Bhattacharyya</h3>
                    <span className="text-rose-400 font-medium">Founder & Director</span>
                  </div>
               </div>
             </div>
             
             <div className="p-8 lg:p-12 lg:w-3/5 flex flex-col justify-center">
               <div className="hidden lg:block mb-6">
                 <h3 className="font-serif text-3xl font-bold text-slate-900 mb-2">Chandrayee Bhattacharyya</h3>
                 <span className="text-rose-600 font-medium text-lg uppercase tracking-wide">Founder & Director</span>
               </div>

               <div className="space-y-6 text-slate-600 leading-relaxed">
                 <p>
                   Chandrayee founded Nrityangan Kathak Academy nearly 30 years ago and has since dedicated her life to teaching, mentoring, and conducting workshops for students of all ages.
                 </p>
                 
                 <div>
                   <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                     <Star size={18} className="text-rose-500" /> Gurus & Mentors
                   </h4>
                   <p className="text-sm bg-rose-50 p-4 rounded-xl border border-rose-100">
                     She has had the privilege of learning from many revered gurus, including Parimal Kishan Ji, Pandit Birju Maharaj Ji, Smt. Saraswati Sen, Smt. Vandana Sen, Pandit Chitresh Das Ji, Saroj Khan Ji, and Kakuli Mukherjee.
                   </p>
                 </div>

                 <div>
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Award size={18} className="text-rose-500" /> Experience & Achievements
                    </h4>
                    <p>
                      In addition to teaching, Ms. Chandrayee has served as a judge for numerous dance competitions and talent shows such as Dance USA Dance, as well as for beauty pageants both in the U.S. and abroad. She has also been an instructor with Vibes, celebrating the evolving journey of dance across cultures.
                    </p>
                 </div>

                 <div>
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                       <Users size={18} className="text-rose-500" /> Performances
                    </h4>
                    <p>
                      She and her troupe have performed at several prestigious events including IACA, IAWW, Art and Heritage, Northwest Folklife, City of Seattle, Ethnic Heritage, Utsav, and many others.
                    </p>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default About;