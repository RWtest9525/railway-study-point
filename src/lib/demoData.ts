import { supabase } from './supabase';

export const DEMO_QUESTIONS = [
  {
    category: 'ALP',
    question_text: 'What is the full form of ALP in Indian Railways?',
    options: ['Assistant Loco Pilot', 'Assistant Line Pilot', 'Assistant Loco Personnel', 'Automated Loco Pilot'],
    correct_answer: 0,
    explanation: 'ALP stands for Assistant Loco Pilot, who assists the Loco Pilot in driving the train.',
  },
  {
    category: 'ALP',
    question_text: 'Which of the following is used for braking in a diesel locomotive?',
    options: ['Vacuum brakes', 'Air brakes', 'Hydraulic brakes', 'None of these'],
    correct_answer: 1,
    explanation: 'Modern diesel locomotives primarily use air brakes for stopping and controlling the train.',
  },
  {
    category: 'NTPC',
    question_text: 'Who was the first female Railway Minister of India?',
    options: ['Sushma Swaraj', 'Mamata Banerjee', 'Pratibha Patil', 'Indira Gandhi'],
    correct_answer: 1,
    explanation: 'Mamata Banerjee was the first woman to hold the post of Railway Minister of India.',
  },
  {
    category: 'Group-D',
    question_text: 'In which year was the first railway line in India opened?',
    options: ['1853', '1857', '1901', '1947'],
    correct_answer: 0,
    explanation: 'The first passenger train in India ran between Bori Bunder (Mumbai) and Thane on 16 April 1853.',
  },
];

export async function loadDemoData(adminId: string) {
  try {
    const questionsWithCreator = DEMO_QUESTIONS.map(q => ({
      ...q,
      created_by: adminId,
    }));

    const { error: qError } = await supabase.from('questions').insert(questionsWithCreator);
    if (qError) throw qError;

    // Create a demo exam for ALP
    const { data: alpQuestions } = await supabase
      .from('questions')
      .select('id')
      .eq('category', 'ALP')
      .limit(2);

    if (alpQuestions && alpQuestions.length > 0) {
      const { error: eError } = await supabase.from('exams').insert({
        title: 'Demo ALP Practice Test',
        category: 'ALP',
        question_ids: alpQuestions.map(q => q.id),
        duration_minutes: 10,
        is_premium: false,
        created_by: adminId,
      });
      if (eError) throw eError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error loading demo data:', error);
    return { success: false, error };
  }
}
