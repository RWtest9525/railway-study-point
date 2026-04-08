import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sampleQuestions = [
  {
    category: 'ALP',
    question_text: 'What is the main function of a locomotive?',
    options: [
      'To carry passengers only',
      'To pull trains and carry cargo',
      'To provide emergency braking',
      'To signal train arrivals'
    ],
    correct_answer: 1,
    explanation: 'A locomotive is primarily used to pull trains and transport cargo over long distances. It provides the motive power for the entire train.'
  },
  {
    category: 'ALP',
    question_text: 'Which component of a locomotive is responsible for braking?',
    options: [
      'Boiler',
      'Brake system',
      'Smokebox',
      'Coupling'
    ],
    correct_answer: 1,
    explanation: 'The brake system in a locomotive is responsible for slowing down or stopping the train. It is crucial for safe operations.'
  },
  {
    category: 'ALP',
    question_text: 'What does OHE stand for in railway terminology?',
    options: [
      'Over Head Equipment',
      'Overhead Electric',
      'Over Head Extension',
      'Overhead Engine'
    ],
    correct_answer: 1,
    explanation: 'OHE stands for Overhead Electric. It refers to the overhead power lines used in electrified railway systems.'
  },
  {
    category: 'ALP',
    question_text: 'What is the gauge of Indian railway tracks?',
    options: [
      '762 mm',
      '1000 mm',
      '1676 mm',
      '2000 mm'
    ],
    correct_answer: 2,
    explanation: 'Indian railways primarily use the Broad Gauge of 1676 mm (5 ft 6 in), which is one of the widest gauges in the world.'
  },
  {
    category: 'ALP',
    question_text: 'Which signaling system is used for safety in Indian railways?',
    options: [
      'American system',
      'European system',
      'Indian Railway Signaling system',
      'Japanese system'
    ],
    correct_answer: 2,
    explanation: 'Indian Railways uses its own standardized signaling system designed specifically for safe train operations across the country.'
  },
  {
    category: 'NTPC',
    question_text: 'What is the capital of France?',
    options: [
      'London',
      'Paris',
      'Berlin',
      'Rome'
    ],
    correct_answer: 1,
    explanation: 'Paris is the capital and largest city of France. It is located in the north-central part of the country on the Seine River.'
  },
  {
    category: 'NTPC',
    question_text: 'Who was the first President of India?',
    options: [
      'Jawaharlal Nehru',
      'Rajendra Prasad',
      'Sardar Vallabhbhai Patel',
      'Abul Kalam Azad'
    ],
    correct_answer: 1,
    explanation: 'Rajendra Prasad was the first President of India, serving from 1950 to 1962. He was a renowned freedom fighter and independence activist.'
  },
  {
    category: 'NTPC',
    question_text: 'What is the chemical formula for water?',
    options: [
      'H2O',
      'CO2',
      'O2',
      'H2'
    ],
    correct_answer: 0,
    explanation: 'The chemical formula for water is H2O, which means it contains two hydrogen atoms and one oxygen atom.'
  },
  {
    category: 'Group-D',
    question_text: 'What is the full form of RRB?',
    options: [
      'Railway Recruitment Bureau',
      'Regional Railways Board',
      'Railways Recruitment Board',
      'Regional Railway Bureau'
    ],
    correct_answer: 2,
    explanation: 'RRB stands for Railways Recruitment Board. It is the organization responsible for recruiting staff for Indian Railways.'
  },
  {
    category: 'Group-D',
    question_text: 'How many states does the Indian railway network cover?',
    options: [
      'All 28 states',
      '27 states',
      'All states and UTs',
      'Only major states'
    ],
    correct_answer: 2,
    explanation: 'Indian Railways cover all states and Union Territories in India. It is one of the world\'s largest railway networks.'
  }
];

async function seedQuestions() {
  try {
    console.log('Starting to seed questions...');

    for (const question of sampleQuestions) {
      const { error } = await supabase
        .from('questions')
        .insert({
          ...question,
          options: question.options as any
        });

      if (error) {
        console.error(`Error inserting question: ${question.question_text}`, error);
      } else {
        console.log(`✓ Added: ${question.question_text}`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seedQuestions();
