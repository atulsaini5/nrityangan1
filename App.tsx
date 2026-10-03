import React, { lazy, Suspense, useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Gallery from './pages/Gallery';
import LandingPage from './pages/LandingPage';
import Admin from './pages/Admin';
import GuestInvitation from './pages/GuestInvitation';
import Enrollment, { CommunicationPreferences, EnrollmentNotice } from './pages/Enrollment';
import Blog from './pages/Blog';
import ClassesPage from './pages/Classes';

const Recitals = lazy(() => import('./pages/Recitals'));
const RecitalAgenda = lazy(() => import('./pages/RecitalAgenda'));

// Custom Hook for Hash-based routing
const useHashLocation = () => {
  const indexedPaths = ['/guest-invitation', '/enroll', '/enrollment-privacy', '/communication-terms', '/communication-preferences', '/admin', '/kids-kathak-bellevue', '/kathak-classes-redmond', '/adult-kathak-bellevue', '/trial-class', '/trial-class/thank-you'];
  const getLocation = () => (indexedPaths.includes(window.location.pathname) || /^\/(?:blog|recitals)(?:\/|$)/.test(window.location.pathname))
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
  const currentPath = useHashLocation();

  if (currentPath === '/admin') return <Admin />;

  // Basic Routing Logic without react-router-dom
  let content;
  switch (currentPath) {
    case '/guest-invitation': content = <GuestInvitation />; break;
    case '/enroll': content = <Enrollment />; break;
    case '/enrollment-privacy': content = <EnrollmentNotice />; break;
    case '/communication-terms': content = <EnrollmentNotice terms />; break;
    case '/communication-preferences': content = <CommunicationPreferences />; break;
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
    default:
      content = /^\/recitals\/\d{4}\/agenda\/?$/.test(currentPath)
        ? <Suspense fallback={<p role="status" className="p-12">Loading agenda...</p>}><RecitalAgenda year={currentPath.split('/')[2]}/></Suspense>
        : /^\/recitals(?:\/|$)/.test(currentPath)
        ? <Suspense fallback={<p role="status" className="p-12">Loading recitals...</p>}><Recitals year={currentPath.replace(/^\/recitals\/?/, '').replace(/\/$/, '') || undefined}/></Suspense>
        : /^\/blog(?:\/|$)/.test(currentPath)
        ? <Blog slug={currentPath.replace(/^\/blog\/?/, '').replace(/\/$/, '') || undefined} />
        : <Home />;
  }

  return (
    <Layout>
      {content}
    </Layout>
  );
};

export default App;
