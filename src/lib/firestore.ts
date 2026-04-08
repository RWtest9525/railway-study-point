import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  category_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks?: number;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  subject: 'Maths' | 'Reasoning' | 'GK' | 'Science';
  question_text: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  marks: number;
  order?: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  exam_id: string;
  answers: { questionId: string; selectedOption: number }[];
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  started_at: string;
  submitted_at: string;
  subject_wise_scores?: { [subject: string]: { correct: number; total: number } };
}

export interface SupportQuery {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

// Categories
export const categoriesRef = collection(db, 'categories');

export const getCategories = async () => {
  const q = query(categoriesRef, where('is_active', '==', true), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const subscribeToCategories = (callback: (categories: Category[]) => void) => {
  const q = query(categoriesRef, where('is_active', '==', true), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    callback(categories);
  });
};

export const getCategory = async (categoryId: string) => {
  const docRef = doc(db, 'categories', categoryId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Category;
  }
  return null;
};

export const createCategory = async (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
  const docRef = await addDoc(categoriesRef, {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
};

export const updateCategory = async (categoryId: string, data: Partial<Category>) => {
  const docRef = doc(db, 'categories', categoryId);
  await updateDoc(docRef, {
    ...data,
    updated_at: serverTimestamp(),
  });
};

export const deleteCategory = async (categoryId: string) => {
  await deleteDoc(doc(db, 'categories', categoryId));
};

// Exams
export const examsRef = collection(db, 'exams');

export const getExams = async (categoryId?: string) => {
  let q;
  if (categoryId) {
    q = query(examsRef, where('category_id', '==', categoryId), where('is_active', '==', true));
  } else {
    q = query(examsRef, where('is_active', '==', true));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
};

export const getExam = async (examId: string) => {
  const docRef = doc(db, 'exams', examId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Exam;
  }
  return null;
};

export const createExam = async (data: Omit<Exam, 'id' | 'created_at' | 'updated_at'>) => {
  const docRef = await addDoc(examsRef, {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
};

export const updateExam = async (examId: string, data: Partial<Exam>) => {
  const docRef = doc(db, 'exams', examId);
  await updateDoc(docRef, {
    ...data,
    updated_at: serverTimestamp(),
  });
};

export const deleteExam = async (examId: string) => {
  await deleteDoc(doc(db, 'exams', examId));
};

// Questions
export const questionsRef = collection(db, 'questions');

export const getQuestions = async (examId: string) => {
  const q = query(questionsRef, where('exam_id', '==', examId), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
};

export const getQuestionsBySubject = async (examId: string, subject: string) => {
  const q = query(
    questionsRef, 
    where('exam_id', '==', examId),
    where('subject', '==', subject),
    orderBy('order', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
};

export const createQuestion = async (data: Omit<Question, 'id' | 'created_at'>) => {
  const docRef = await addDoc(questionsRef, {
    ...data,
    created_at: serverTimestamp(),
  });
  return docRef.id;
};

export const createQuestionsBatch = async (questions: Omit<Question, 'id' | 'created_at'>[]) => {
  const batchPromises = questions.map(q => 
    addDoc(questionsRef, {
      ...q,
      created_at: serverTimestamp(),
    })
  );
  await Promise.all(batchPromises);
};

export const updateQuestion = async (questionId: string, data: Partial<Question>) => {
  const docRef = doc(db, 'questions', questionId);
  await updateDoc(docRef, data);
};

export const deleteQuestion = async (questionId: string) => {
  await deleteDoc(doc(db, 'questions', questionId));
};

// Quiz Attempts
export const attemptsRef = collection(db, 'attempts');

export const createAttempt = async (data: Omit<QuizAttempt, 'id' | 'submitted_at'>) => {
  const docRef = await addDoc(attemptsRef, {
    ...data,
    submitted_at: serverTimestamp(),
  });
  return docRef.id;
};

export const getAttempts = async (userId: string, examId?: string) => {
  let q;
  if (examId) {
    q = query(
      attemptsRef, 
      where('user_id', '==', userId),
      where('exam_id', '==', examId),
      orderBy('submitted_at', 'desc')
    );
  } else {
    q = query(
      attemptsRef, 
      where('user_id', '==', userId),
      orderBy('submitted_at', 'desc'),
      limit(50)
    );
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
};

export const getUserAttempts = getAttempts;

export const getAttempt = async (attemptId: string) => {
  const docRef = doc(db, 'attempts', attemptId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as QuizAttempt;
  }
  return null;
};

// Support Queries
export const supportQueriesRef = collection(db, 'support_queries');

export const createSupportQuery = async (data: Omit<SupportQuery, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
  const docRef = await addDoc(supportQueriesRef, {
    ...data,
    status: 'pending',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
};

// Leaderboard
// Users
export const profilesRef = collection(db, 'profiles');

export const getUsers = async () => {
  const snapshot = await getDocs(profilesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getLeaderboard = async (limitCount: number = 100) => {
  // This would typically be a cloud function or aggregated data
  // For now, we'll query attempts and calculate scores
  const q = query(
    attemptsRef,
    orderBy('score', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
};

// Utility function to convert Firestore Timestamp to ISO string
export const timestampToString = (timestamp: Timestamp | string | null | undefined): string => {
  if (!timestamp) return '';
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate().toISOString();
};