import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Mock categories
const categories = [
  { id: 'cat1', name: 'Railway Exams', description: 'Railway recruitment exams' },
  { id: 'cat2', name: 'SSC Exams', description: 'Staff Selection Commission exams' },
  { id: 'cat3', name: 'Banking Exams', description: 'Banking sector exams' }
];

// Mock exams
const exams = [
  { id: 'exam1', category_id: 'cat1', title: 'NTPC Mock Test 01', duration_minutes: 90, total_marks: 100, is_active: true },
  { id: 'exam2', category_id: 'cat1', title: 'Group D Mock Test 01', duration_minutes: 90, total_marks: 100, is_active: true },
  { id: 'exam3', category_id: 'cat2', title: 'SSC CGL Mock Test 01', duration_minutes: 60, total_marks: 100, is_active: true }
];

// Mock questions
const questions = [
  // Maths
  {
    exam_id: 'exam1',
    subject: 'Maths',
    question_text: 'What is 25% of 80?',
    options: ['15', '20', '25', '30'],
    correct_index: 1,
    explanation: '25% of 80 = 0.25 × 80 = 20',
    marks: 1
  },
  {
    exam_id: 'exam1',
    subject: 'Maths',
    question_text: 'If a train travels 60 km in 1 hour, what is its speed in m/s?',
    options: ['16.67 m/s', '18.5 m/s', '20 m/s', '22.2 m/s'],
    correct_index: 0,
    explanation: '60 km/h = 60 × 1000 / 3600 = 16.67 m/s',
    marks: 1
  },
  {
    exam_id: 'exam1',
    subject: 'Maths',
    question_text: 'Find the value of x: 2x + 5 = 17',
    options: ['5', '6', '7', '8'],
    correct_index: 1,
    explanation: '2x = 17 - 5 = 12, so x = 6',
    marks: 1
  },
  
  // Reasoning
  {
    exam_id: 'exam1',
    subject: 'Reasoning',
    question_text: 'Complete the series: 2, 4, 8, 16, ?',
    options: ['20', '24', '32', '64'],
    correct_index: 2,
    explanation: 'Each number is multiplied by 2',
    marks: 1
  },
  {
    exam_id: 'exam1',
    subject: 'Reasoning',
    question_text: 'If CAT is coded as 3120, what is DOG coded as?',
    options: ['4157', '4167', '4177', '4187'],
    correct_index: 1,
    explanation: 'C=3, A=1, T=20, so D=4, O=15, G=7',
    marks: 1
  },
  
  // GK
  {
    exam_id: 'exam1',
    subject: 'GK',
    question_text: 'Who is the current Prime Minister of India?',
    options: ['Narendra Modi', 'Rahul Gandhi', 'Amit Shah', 'Yogi Adityanath'],
    correct_index: 0,
    explanation: 'Narendra Modi is the current Prime Minister',
    marks: 1
  },
  {
    exam_id: 'exam1',
    subject: 'GK',
    question_text: 'Which is the capital of India?',
    options: ['Mumbai', 'Kolkata', 'Chennai', 'New Delhi'],
    correct_index: 3,
    explanation: 'New Delhi is the capital of India',
    marks: 1
  },
  
  // Science
  {
    exam_id: 'exam1',
    subject: 'Science',
    question_text: 'What is the chemical symbol for water?',
    options: ['H2O', 'CO2', 'O2', 'NaCl'],
    correct_index: 0,
    explanation: 'Water is H2O',
    marks: 1
  },
  {
    exam_id: 'exam1',
    subject: 'Science',
    question_text: 'Which planet is known as the Red Planet?',
    options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
    correct_index: 1,
    explanation: 'Mars is known as the Red Planet',
    marks: 1
  }
];

// Mock leaderboard data
const leaderboardData = [
  { name: 'Rahul Sharma', score: 95, exam: 'NTPC Mock Test 01', date: '2024-01-15' },
  { name: 'Priya Singh', score: 92, exam: 'NTPC Mock Test 01', date: '2024-01-14' },
  { name: 'Amit Kumar', score: 88, exam: 'NTPC Mock Test 01', date: '2024-01-13' },
  { name: 'Sneha Patel', score: 85, exam: 'NTPC Mock Test 01', date: '2024-01-12' },
  { name: 'Vikram Joshi', score: 82, exam: 'NTPC Mock Test 01', date: '2024-01-11' },
  { name: 'Anjali Rao', score: 79, exam: 'NTPC Mock Test 01', date: '2024-01-10' },
  { name: 'Rajesh Mehta', score: 76, exam: 'NTPC Mock Test 01', date: '2024-01-09' },
  { name: 'Neha Gupta', score: 73, exam: 'NTPC Mock Test 01', date: '2024-01-08' },
  { name: 'Suresh Reddy', score: 70, exam: 'NTPC Mock Test 01', date: '2024-01-07' },
  { name: 'Pooja Desai', score: 68, exam: 'NTPC Mock Test 01', date: '2024-01-06' }
];

export async function seedMockData() {
  try {
    console.log('Seeding mock data...');
    
    // Add categories
    for (const category of categories) {
      await setDoc(doc(db, 'categories', category.id), category);
    }
    console.log('Categories added');
    
    // Add exams
    for (const exam of exams) {
      await setDoc(doc(db, 'exams', exam.id), exam);
    }
    console.log('Exams added');
    
    // Add questions
    for (const question of questions) {
      await addDoc(collection(db, 'questions'), question);
    }
    console.log('Questions added');
    
    // Add leaderboard data
    for (const entry of leaderboardData) {
      await addDoc(collection(db, 'leaderboard'), entry);
    }
    console.log('Leaderboard data added');
    
    // Add site settings
    await setDoc(doc(db, 'site_settings', '1'), {
      premium_price_paise: 3900,
      premium_validity_days: 365,
      trial_nudge_interval_seconds: 60,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log('Site settings added');
    
    console.log('Mock data seeded successfully!');
  } catch (error) {
    console.error('Error seeding mock data:', error);
  }
}

export { categories, exams, questions, leaderboardData };