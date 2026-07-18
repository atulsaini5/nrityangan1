import React, { useState, useEffect } from 'react';
import { Menu, X, Instagram, Facebook, Phone, MessageCircle, Youtube, Linkedin } from 'lucide-react';
import { nrityanganImage } from '../lib/storage';

// Custom hook to replace useLocation from react-router-dom
const useHashLocation = () => {
  const [loc, setLoc] = useState(window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const handler = () => setLoc(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return { pathname: loc };
};

// Custom Link component to replace Link from react-router-dom
const Link = ({ to, children, className, onClick }: { to: string; children: React.ReactNode; className?: string; onClick?: () => void }) => {
  return (
    <a 
      href={`#${to}`} 
      className={className} 
      onClick={onClick}
    >
      {children}
    </a>
  );
};

interface LayoutProps {
  children: React.ReactNode;
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, isLoggedIn, onLogin, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useHashLocation();

  const isActive = (path: string) => location.pathname === path ? 'text-rose-500 font-semibold' : 'text-gray-600 hover:text-rose-500';

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-gray-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img src={nrityanganImage('Nrityangan Logo.jpg')} alt="Nrityangan" className="h-12 w-12 rounded-full object-cover" />
              <span className="font-serif text-2xl font-bold tracking-tight text-slate-900">Nrityangan<span className="text-rose-500">.</span></span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className={isActive('/')}>Home</Link>
              <Link to="/classes" className={isActive('/classes')}>Classes</Link>
              <Link to="/gallery" className={isActive('/gallery')}>Gallery</Link>
              <Link to="/about" className={isActive('/about')}>About</Link>
              {isLoggedIn && (
                <>
                  <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
                  <Link to="/videos" className={isActive('/videos')}>Rehearsals</Link>
                </>
              )}
              
              {!isLoggedIn ? (
                <button 
                  onClick={onLogin}
                  className="bg-rose-500 text-white px-6 py-2 rounded-full hover:bg-rose-600 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Login
                </button>
              ) : (
                <button 
                  onClick={onLogout}
                  className="border border-gray-300 text-gray-600 px-6 py-2 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none p-2"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 shadow-xl absolute w-full z-40">
            <div className="px-4 pt-2 pb-6 space-y-2 flex flex-col">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-500 rounded-md">Home</Link>
              <Link to="/classes" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-500 rounded-md">Classes</Link>
              <Link to="/gallery" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-500 rounded-md">Gallery</Link>
              <Link to="/about" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-500 rounded-md">About</Link>
              {isLoggedIn && (
                 <>
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-500 rounded-md">Dashboard</Link>
                  <Link to="/videos" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-500 rounded-md">Rehearsals</Link>
                </>
              )}
              <div className="pt-4 mt-2 border-t border-gray-100">
                 {!isLoggedIn ? (
                  <button onClick={() => {onLogin(); setIsMenuOpen(false)}} className="w-full text-center bg-rose-500 text-white px-4 py-3 rounded-md hover:bg-rose-600 font-medium">
                    Login
                  </button>
                 ) : (
                  <button onClick={() => {onLogout(); setIsMenuOpen(false)}} className="w-full text-center bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 font-medium">
                    Logout
                  </button>
                 )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Social & Contact Info Bar */}
      <div className="bg-slate-50 border-b border-gray-200 py-2.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-center md:justify-end items-center gap-4 md:gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-4">
                  <a href="tel:14257855217" className="flex items-center gap-2 hover:text-rose-600 transition-colors">
                    <Phone size={14} className="text-rose-500" />
                    <span>(425) 785-5217</span>
                  </a>
              </div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div className="flex items-center gap-3">
                  <a href="https://www.instagram.com/nrityangankathak3/" target="_blank" rel="noopener noreferrer" className="hover:text-rose-600 transition-colors"><Instagram size={16} /></a>
                  <a href="https://www.facebook.com/profile.php?id=100049048404597" target="_blank" rel="noopener noreferrer" className="hover:text-rose-600 transition-colors"><Facebook size={16} /></a>
                  <a href="https://www.linkedin.com/in/chandrayee-bhattacharyya-09b089300/" target="_blank" rel="noopener noreferrer" className="hover:text-rose-600 transition-colors"><Linkedin size={16} /></a>
                  <a href="https://www.youtube.com/@kathakseattle" target="_blank" rel="noopener noreferrer" className="hover:text-rose-600 transition-colors" aria-label="Nrityangan on YouTube"><Youtube size={16} /></a>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow relative">
        {children}
      </main>

      {/* WhatsApp Floating Button */}
      <a 
        href="https://wa.me/14257855217" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20bd5a] transition-all duration-300 hover:scale-110 flex items-center justify-center"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle size={28} />
      </a>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 md:col-span-1">
              <span className="font-serif text-2xl font-bold tracking-tight">Nrityangan<span className="text-rose-500">.</span></span>
              <p className="mt-4 text-slate-400 text-sm">
                Preserving tradition, inspiring creativity. Join our Kathak family.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-rose-400">Locations</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>Samena Club, Bellevue</li>
                <li>Ada Studio, Redmond</li>
                <li>Sri Balaji Temple, Bellevue</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-rose-400">Quick Links</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li><Link to="/classes" className="hover:text-white">Our Offerings</Link></li>
                <li><Link to="/gallery" className="hover:text-white">Gallery</Link></li>
                <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} Nrityangan Kathak Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;