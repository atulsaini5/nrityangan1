import { Location, ClassSession, User, Video, TuitionItem, CalendarEvent, ClassCategory } from './types';
import { nrityanganImage } from './lib/storage';

export const LOCATIONS: Location[] = [
  {
    id: 'loc1',
    name: 'Samena Club',
    address: '15231 Lake Hills Blvd, Bellevue, WA 98007',
    image: 'https://picsum.photos/seed/samena_loc/800/600',
  },
  {
    id: 'loc2',
    name: 'SaiBaba Temple',
    address: '16126 NE 87th St, Redmond, WA 98052',
    image: 'https://picsum.photos/seed/ada_loc/800/600',
  },
  {
    id: 'loc3',
    name: 'Sri Balaji Temple',
    address: '12501 Bel-Red Rd, Bellevue, WA 98005',
    image: 'https://picsum.photos/seed/temple_loc/800/600',
  },
];

export const CLASSES: ClassSession[] = [
  // 1) Kathak Beginner Kids (Formerly Kathak Beginner)
  // Keeping existing schedule for Kids as no specific change was requested for them, 
  // aside from the name change.
  { 
    id: 'c1_1', 
    title: 'Kathak Beginner Kids', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc2', // SaiBaba Temple
    dayOfWeek: 'Monday', 
    startTime: '17:15', 
    durationMinutes: 45, 
    ageGroup: '5-12', 
    level: 'Beginner', 
    curriculum: 'Rhythm, posture, hand movements, basic spins, extended tatkaar, todas, parans, amad.' 
  },
  { 
    id: 'c1_2', 
    title: 'Kathak Beginner Kids', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc1', // Samena
    dayOfWeek: 'Friday', 
    startTime: '17:15', 
    durationMinutes: 45, 
    ageGroup: '5-12', 
    level: 'Beginner', 
    curriculum: 'Rhythm, posture, hand movements, basic spins, extended tatkaar, todas, parans, amad.' 
  },

  // 2) Kathak Beginner Teen/Adult (Formerly Kathak Beginner Adult)
  // Schedule: SaiBaba Temple Mon 4:30pm-5:15pm, Samena Fri 6-7pm, Samena Sun 11am-12noon
  { 
    id: 'c_beg_ta_1', 
    title: 'Kathak Beginner Teen/Adult', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc2', // SaiBaba Temple
    dayOfWeek: 'Monday', 
    startTime: '16:30', 
    durationMinutes: 45, 
    ageGroup: 'Teen/Adult', 
    level: 'Beginner', 
    curriculum: 'Introduction to foundational movements and rhythmic patterns of Kathak.' 
  },
  { 
    id: 'c_beg_ta_2', 
    title: 'Kathak Beginner Teen/Adult', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc1', // Samena
    dayOfWeek: 'Friday', 
    startTime: '18:00', 
    durationMinutes: 60, 
    ageGroup: 'Teen/Adult', 
    level: 'Beginner', 
    curriculum: 'Introduction to foundational movements and rhythmic patterns of Kathak.' 
  },
  { 
    id: 'c_beg_ta_3', 
    title: 'Kathak Beginner Teen/Adult', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc1', // Samena
    dayOfWeek: 'Sunday', 
    startTime: '11:00', 
    durationMinutes: 60, 
    ageGroup: 'Teen/Adult', 
    level: 'Beginner', 
    curriculum: 'Introduction to foundational movements and rhythmic patterns of Kathak.' 
  },

  // 3) Kathak Intermediate Kids/Teen (Formerly Kathak Intermediate)
  // Schedule: Samena 5-6pm (Assuming Friday based on context of other Samena classes)
  { 
    id: 'c_int_kt_1', 
    title: 'Kathak Intermediate Kids/Teen', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc1', // Samena
    dayOfWeek: 'Friday', 
    startTime: '17:00', 
    durationMinutes: 60, 
    ageGroup: 'Kids/Teen', 
    level: 'Intermediate', 
    curriculum: 'Refined footwork, expressive abhinaya, complex compositions.' 
  },

  // 4) Kathak Intermediate-Advanced Teen/Adult (Formerly Kathak Intermediate Youth)
  // Schedule: Sri Balaji Wednesdays 6-7pm and Sundays 10-11am
  { 
    id: 'c_int_adv_1', 
    title: 'Kathak Intermediate-Advanced Teen/Adult', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc3', // Sri Balaji
    dayOfWeek: 'Wednesday', 
    startTime: '18:00', 
    durationMinutes: 60, 
    ageGroup: 'Teen/Adult', 
    level: 'Intermediate-Advanced', 
    curriculum: 'Strengthen technique, rhythm, and expression. Complex footwork patterns and graceful spins.' 
  },
  { 
    id: 'c_int_adv_2', 
    title: 'Kathak Intermediate-Advanced Teen/Adult', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc3', // Sri Balaji
    dayOfWeek: 'Sunday', 
    startTime: '10:00', 
    durationMinutes: 60, 
    ageGroup: 'Teen/Adult', 
    level: 'Intermediate-Advanced', 
    curriculum: 'Strengthen technique, rhythm, and expression. Complex footwork patterns and graceful spins.' 
  },

  // 5) Mom & Me / Senior Kathak
  // Schedule: Sundays 12-12:30pm (Assuming Samena as it's the Sunday hub)
  { 
    id: 'c_mom_1', 
    title: 'Mom & Me / Senior Kathak', 
    instructor: 'Chandrayee Bhattacharyya', 
    locationId: 'loc1', // Samena
    dayOfWeek: 'Sunday', 
    startTime: '12:00', 
    durationMinutes: 30, 
    ageGroup: 'All Ages', 
    level: 'Mixed', 
    curriculum: 'Cherished memories through rhythm and grace. Welcoming space for seniors.' 
  },
];

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Jessica Doe (Parent of Alice)',
  role: 'parent',
  email: 'jessica@example.com',
  enrolledClasses: ['c1_1', 'c_int_kt_1'], 
};

export const REHEARSAL_VIDEOS: Video[] = [
  { id: 'v1', title: 'Tatkar Practice - Week 4', classId: 'c1', date: '2023-10-15', thumbnailUrl: 'https://picsum.photos/seed/kathak_vid1/400/300', duration: '2:15' },
  { id: 'v2', title: 'Teen Taal Kaida', classId: 'c2', date: '2023-10-17', thumbnailUrl: 'https://picsum.photos/seed/kathak_vid2/400/300', duration: '1:45' },
  { id: 'v3', title: 'Saraswati Vandana Rehearsal', classId: 'c1', date: '2023-10-22', thumbnailUrl: 'https://picsum.photos/seed/kathak_vid3/400/300', duration: '3:30' },
];

export const TUITION_ITEMS: TuitionItem[] = [
  { id: 't1', description: 'October Tuition - Beginner Kids', amount: 95, dueDate: '2023-10-01', status: 'paid' },
  { id: 't2', description: 'October Tuition - Intermediate Kids', amount: 95, dueDate: '2023-10-01', status: 'paid' },
  { id: 't3', description: 'Recital Costume Deposit', amount: 75, dueDate: '2023-11-01', status: 'pending' },
];

export const EVENTS: CalendarEvent[] = [
  { id: 'e1', title: 'Annual Recital Auditions', date: '2023-11-05', type: 'performance' },
  { id: 'e2', title: 'Diwali Celebration', date: '2023-11-12', type: 'holiday' },
  { id: 'e3', title: 'Winter Break', date: '2023-12-20', type: 'holiday' },
];

// --- Class Display Categories ---
export const CLASS_CATEGORIES: ClassCategory[] = [
  {
    id: 'begin-kids',
    title: "Kathak Beginner Kids",
    age: "Ages 5-12",
    image: nrityanganImage('Begineer-Kids.jpg'),
    description: "A foundational journey into Kathak focusing on rhythm, posture, hand movements, and basic spins, progressing to extended tatkaar, simple compositions like todas, parans, and amad.",
    match: { title: 'Kathak Beginner Kids', ageGroup: '5-12' }
  },
  {
    id: 'begin-teen-adult',
    title: "Kathak Beginner Teen/Adult",
    age: "Teen & Adult",
    image: nrityanganImage('Begineer-Adult-Teen.png'),
    description: "Embark on your Kathak dance journey with our beginner classes, carefully crafted to introduce you to the foundational movements and rhythmic patterns of this captivating dance form. Multiple weekly slots available.",
    match: { title: 'Kathak Beginner Teen/Adult' }
  },
  {
    id: 'inter-kids-teen',
    title: "Kathak Intermediate Kids/Teen",
    age: "Kids & Teens",
    image: nrityanganImage('Int-kids-teen.png'),
    description: "Deepen your Kathak practice with refined footwork, expressive abhinaya, and complex compositions. This class bridges the gap between foundational skills and advanced performance techniques.",
    match: { title: 'Kathak Intermediate Kids/Teen' }
  },
  {
    id: 'inter-adv-teen-adult',
    title: "Kathak Inter-Adv Teen/Adult",
    age: "Teen & Adult",
    image: nrityanganImage('Inter-AdvTeenAdult.png'),
    description: "Designed for serious practitioners to strengthen technique, rhythm, and expression. Explore complex footwork patterns, graceful spins, and abhinaya at our Sri Balaji Temple location.",
    match: { title: 'Kathak Intermediate-Advanced Teen/Adult' }
  },
  {
    id: 'mixed',
    title: "Mom & Me / Senior",
    age: "Mixed Ages",
    image: nrityanganImage('Momandme.png'),
    description: "A special class designed for mothers and daughters to learn Kathak together - creating cherished memories through rhythm, grace, and movement. Also a welcoming space for seniors.",
    match: { title: 'Mom & Me / Senior Kathak' }
  }
];