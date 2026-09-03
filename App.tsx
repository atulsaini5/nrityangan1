import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import Gallery from './pages/Gallery';
import LandingPage from './pages/LandingPage';
import Admin from './pages/Admin';
import { MOCK_USER, CLASSES, LOCATIONS, CLASS_CATEGORIES } from './constants';
import { User, ClassSession } from './types';
import { Clock, MapPin, Calendar as CalendarIcon } from 'lucide-react';

// --- Helper ---
const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hours = h % 12 || 12;
  return `${hours}:${m.toString().padStart(2, '0')} ${period}`;
};

// --- Components for Classes Page ---

const ClassCard = ({ title, age, description, sessions, image }: { title: string, age: string, description: string, sessions: ClassSession[], image: string }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full group">
    <div className="h-56 overflow-hidden relative">
      <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors z-10"></div>
      <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute top-4 right-4 z-20">
         <span className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-gray-100">{age}</span>
      </div>
    </div>
    <div className="p-6 flex-1 flex flex-col">
      <h3 className="text-xl font-bold text-slate-900 font-serif mb-3 group-hover:text-rose-600 transition-colors">{title}</h3>
      <p className="text-slate-600 mb-6 leading-relaxed text-sm flex-1">{description}</p>
      
      <div className="space-y-3 mt-auto pt-4 border-t border-gray-50">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weekly Sessions</h4>
        {sessions.map((session, idx) => {
          const locName = LOCATIONS.find(l => l.id === session.locationId)?.name || 'Unknown Location';
          return (
            <div key={idx} className="flex items-center text-sm text-slate-700 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100/50">
              <Clock size={14} className="text-rose-500 mr-2 flex-shrink-0" />
              <span className="font-medium mr-1 whitespace-nowrap">{session.dayOfWeek}s</span>
              <span className="whitespace-nowrap">{formatTime(session.startTime)}</span>
              <span className="mx-2 text-slate-300">|</span>
              <MapPin size={14} className="text-rose-500 mr-1 flex-shrink-0" />
              <span className="truncate">{locName}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const CalendarView = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Helper to convert time string "17:15" to minutes from start of day for sorting
  const getMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[800px] bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-slate-50">
          {days.map(day => (
            <div key={day} className="py-4 text-center text-sm font-bold text-slate-700 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[400px]">
          {days.map(day => {
            const dayClasses = CLASSES.filter(c => c.dayOfWeek === day).sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));
            return (
              <div key={day} className="p-2 space-y-2 bg-white">
                {dayClasses.map((cls, idx) => {
                  const locName = LOCATIONS.find(l => l.id === cls.locationId)?.name.split(' ')[0] || 'Loc';
                  // Color coding based on level/type roughly
                  const colorClass = cls.title.includes('Beginner') 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : cls.title.includes('Intermediate') 
                      ? 'bg-blue-50 border-blue-100 text-blue-800'
                      : 'bg-amber-50 border-amber-100 text-amber-800';

                  return (
                    <div key={idx} className={`p-2 rounded-lg border text-xs ${colorClass} hover:shadow-md transition-shadow cursor-pointer`}>
                      <div className="font-bold truncate">{cls.title}</div>
                      <div className="flex items-center gap-1 mt-1 opacity-80">
                        <Clock size={10} /> {formatTime(cls.startTime)}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 opacity-80">
                        <MapPin size={10} /> {locName}
                      </div>
                    </div>
                  );
                })}
                {dayClasses.length === 0 && (
                  <div className="text-center text-slate-300 text-xs py-8 italic">No Classes</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ClassesPage = () => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Prepare display data by mapping categories to their sessions
  const classTypes = CLASS_CATEGORIES.map(cat => ({
    ...cat,
    sessions: CLASSES.filter(c => 
      c.title === cat.match.title && 
      (!cat.match.ageGroup || c.ageGroup === cat.match.ageGroup)
    )
  }));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-slate-900 py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h1 className="font-serif text-4xl font-bold text-white mb-4">Class Schedule & Curriculum</h1>
          <p className="text-slate-300 max-w-2xl mx-auto">Explore our diverse offerings designed for every age and skill level.</p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toggle View */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1 rounded-full shadow-sm border border-gray-200 inline-flex">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 hover:bg-gray-50'}`}
            >
              List View
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 hover:bg-gray-50'}`}
            >
              <CalendarIcon size={16} /> Calendar View
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {classTypes.map((cls, i) => (
              <ClassCard key={i} {...cls} />
            ))}
          </div>
        ) : (
          <CalendarView />
        )}
      </div>
    </div>
  );
};

// Custom Hook for Hash-based routing
const useHashLocation = () => {
  const indexedPaths = ['/admin', '/kids-kathak-bellevue', '/kathak-classes-redmond', '/adult-kathak-bellevue', '/trial-class', '/trial-class/thank-you'];
  const getLocation = () => indexedPaths.includes(window.location.pathname)
    ? window.location.pathname
    : window.location.hash.replace(/^#/, '') || '/';
  const [loc, setLoc] = useState(getLocation);
  useEffect(() => {
    const handler = () => setLoc(getLocation());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return loc;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const currentPath = useHashLocation();

  const handleLogin = () => {
    // Mock login
    setUser(MOCK_USER);
  };

  const handleLogout = () => {
    setUser(null);
    window.location.hash = '/';
  };

  if (currentPath === '/admin') return <Admin />;

  // Basic Routing Logic without react-router-dom
  let content;
  switch (currentPath) {
    case '/':
      content = <Home />;
      break;
    case '/classes':
      content = <ClassesPage />;
      break;
    case '/about':
      content = <About />;
      break;
    case '/gallery':
      content = <Gallery />;
      break;
    case '/kids-kathak-bellevue':
      content = <LandingPage kind="kids-bellevue" />;
      break;
    case '/kathak-classes-redmond':
      content = <LandingPage kind="redmond" />;
      break;
    case '/adult-kathak-bellevue':
      content = <LandingPage kind="adult-bellevue" />;
      break;
    case '/trial-class':
      content = <LandingPage kind="trial" />;
      break;
    case '/trial-class/thank-you':
      content = <LandingPage kind="trial-thank-you" />;
      break;
    case '/dashboard':
      content = user ? <Dashboard user={user} /> : <Home />;
      break;
    case '/videos':
      content = user ? <Dashboard user={user} /> : <Home />;
      break;
    default:
      content = <Home />;
  }

  // Handle redirects side-effect
  useEffect(() => {
    if ((currentPath === '/dashboard' || currentPath === '/videos') && !user) {
      window.location.hash = '/';
    }
  }, [currentPath, user]);

  return (
    <Layout isLoggedIn={!!user} onLogin={handleLogin} onLogout={handleLogout}>
      {content}
    </Layout>
  );
};

export default App;
