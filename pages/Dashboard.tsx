import React, { useState } from 'react';
import { Calendar, CreditCard, Video, Clock, CheckCircle, ChevronRight, Bell } from 'lucide-react';
import { MOCK_USER, CLASSES, TUITION_ITEMS, EVENTS, REHEARSAL_VIDEOS } from '../constants';
import { User, ClassSession } from '../types';

interface DashboardProps {
  user: User;
}

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hours = h % 12 || 12;
  return `${hours}:${m.toString().padStart(2, '0')} ${period}`;
};

const formatTimeRange = (startTime: string, durationMinutes: number) => {
   const [startH, startM] = startTime.split(':').map(Number);
   const startTotal = startH * 60 + startM;
   const endTotal = startTotal + durationMinutes;
   const endH = Math.floor(endTotal / 60);
   const endM = endTotal % 60;
   
   return `${formatTime(startTime)} - ${formatTime(`${endH}:${endM}`)}`;
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'tuition' | 'videos'>('overview');

  // Filter classes for the user
  const userClasses = CLASSES.filter(c => user.enrolledClasses.includes(c.id));
  
  // Calculate total due
  const totalDue = TUITION_ITEMS.reduce((sum, item) => item.status !== 'paid' ? sum + item.amount : sum, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900">Welcome back, {user.name.split(' ')[0]}</h1>
              <p className="text-slate-500 text-sm mt-1">Here is what is happening at the studio this week.</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Bell size={24} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-slate-900">{user.role === 'parent' ? 'Parent Account' : 'Student'}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Overview', icon: CheckCircle },
              { id: 'schedule', label: 'My Schedule', icon: Calendar },
              { id: 'tuition', label: 'Tuition & Payments', icon: CreditCard },
              { id: 'videos', label: 'Rehearsal Videos', icon: Video },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'bg-rose-50 text-rose-600 border-b-2 border-rose-500' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-gray-50'}
                `}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Classes Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-serif text-xl font-bold text-slate-900 mb-6">Upcoming Classes</h3>
                <div className="space-y-4">
                  {userClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-rose-200 transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold flex-shrink-0">
                        {cls.dayOfWeek.substring(0, 3)}
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className="font-bold text-slate-800">{cls.title}</h4>
                        <div className="flex items-center text-sm text-slate-500 mt-1 gap-3">
                          <span className="flex items-center gap-1"><Clock size={14} /> {formatTimeRange(cls.startTime, cls.durationMinutes)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{cls.instructor}</span>
                        </div>
                      </div>
                      <button className="px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* School Calendar Feed */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-xl font-bold text-slate-900">Important Dates</h3>
                  <button className="text-sm text-rose-600 font-medium hover:text-rose-700">View All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EVENTS.map((evt) => (
                    <div key={evt.id} className={`p-4 rounded-xl border-l-4 ${evt.type === 'holiday' ? 'border-amber-400 bg-amber-50' : 'border-indigo-400 bg-indigo-50'}`}>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{evt.type}</div>
                      <div className="font-bold text-slate-800">{evt.title}</div>
                      <div className="text-sm text-slate-600 mt-1">{new Date(evt.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Quick Tuition Status */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <CreditCard size={120} />
                </div>
                <h3 className="text-lg font-medium text-slate-300">Balance Due</h3>
                <div className="text-4xl font-bold mt-2 mb-6">${totalDue.toFixed(2)}</div>
                {totalDue > 0 ? (
                   <button className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-rose-900/20">
                    Pay Now
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 p-3 rounded-lg">
                    <CheckCircle size={20} />
                    <span className="font-medium">All caught up!</span>
                  </div>
                )}
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <div className="text-sm text-slate-400 mb-2">Recent Payments</div>
                  <div className="text-sm font-medium">October Tuition - Paid on Oct 1</div>
                </div>
              </div>

              {/* Latest Video */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-serif text-lg font-bold text-slate-900 mb-4">Latest Rehearsal</h3>
                <div className="relative rounded-xl overflow-hidden aspect-video group cursor-pointer">
                  <img src={REHEARSAL_VIDEOS[0].thumbnailUrl} alt="Video thumb" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center pl-1 group-hover:scale-110 transition-transform">
                      <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {REHEARSAL_VIDEOS[0].duration}
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 mt-3">{REHEARSAL_VIDEOS[0].title}</h4>
                <p className="text-sm text-slate-500">{new Date(REHEARSAL_VIDEOS[0].date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-serif text-2xl font-bold text-slate-900">Weekly Schedule</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                const dayClasses = userClasses.filter(c => c.dayOfWeek === day);
                return (
                  <div key={day} className="p-6 flex flex-col md:flex-row md:items-start gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-32 font-bold text-slate-400 uppercase tracking-wide text-sm pt-1">{day}</div>
                    {dayClasses.length > 0 ? (
                      <div className="flex-1 space-y-4">
                        {dayClasses.map(cls => (
                          <div key={cls.id} className="flex flex-col sm:flex-row gap-4 sm:items-center bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-1">
                                 <h4 className="font-bold text-slate-900">{cls.title}</h4>
                                 <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full font-medium">{cls.level}</span>
                               </div>
                               <div className="text-sm text-slate-500">{formatTimeRange(cls.startTime, cls.durationMinutes)}</div>
                               <div className="text-sm text-slate-500 mt-1">Instructor: {cls.instructor} • Age: {cls.ageGroup}</div>
                             </div>
                             <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg max-w-xs">
                               <span className="font-semibold text-rose-500 block text-xs uppercase mb-1">Curriculum Focus</span>
                               {cls.curriculum}
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-400 italic text-sm py-1">No classes scheduled</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIDEOS TAB */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {REHEARSAL_VIDEOS.map((video) => (
              <div key={video.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
                <div className="relative aspect-video">
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer">
                     <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center pl-1 text-rose-500 shadow-xl transform group-hover:scale-110 transition-transform">
                        <Video size={24} fill="currentColor" />
                     </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
                    {video.duration}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 mb-1">{video.title}</h3>
                  <div className="flex justify-between items-center text-sm text-slate-500">
                    <span>{new Date(video.date).toLocaleDateString()}</span>
                    <button className="text-rose-600 font-medium hover:text-rose-700">Download</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TUITION TAB */}
        {activeTab === 'tuition' && (
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-serif text-2xl font-bold text-slate-900">Payment History</h2>
                <div className="text-right">
                  <div className="text-sm text-slate-500">Total Outstanding</div>
                  <div className="text-2xl font-bold text-slate-900">${totalDue.toFixed(2)}</div>
                </div>
             </div>
             <table className="w-full">
               <thead className="bg-gray-50 border-b border-gray-200">
                 <tr>
                   <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                   <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                   <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                   <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                   <th className="py-4 px-6"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {TUITION_ITEMS.map((item) => (
                   <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                     <td className="py-4 px-6 text-slate-900 font-medium">{item.description}</td>
                     <td className="py-4 px-6 text-slate-500 text-sm">{new Date(item.dueDate).toLocaleDateString()}</td>
                     <td className="py-4 px-6 text-slate-900 font-bold text-right">${item.amount.toFixed(2)}</td>
                     <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 
                            item.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                            'bg-amber-100 text-amber-800'}
                        `}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                     </td>
                     <td className="py-4 px-6 text-right">
                       {item.status !== 'paid' && (
                         <button className="text-rose-600 hover:text-rose-900 font-medium text-sm">Pay Now</button>
                       )}
                       {item.status === 'paid' && (
                         <button className="text-slate-400 hover:text-slate-600 font-medium text-sm">Receipt</button>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;