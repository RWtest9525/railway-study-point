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

// Enhanced Category type
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  order?: number;
  is_active: boolean;
  is_test_container?: boolean;
  created_at: string;
  updated_at: string;
}

// Enhanced Exam type with proctoring, scheduling, negative marking
export interface Exam {
  id: string;
  category_id: string;
  category_node_id?: string;
  title: string;
  description?: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks?: number;
  negative_marking?: number; // -0.25, -0.33, etc.
  sectional_timing?: {
    maths?: number;
    reasoning?: number;
    science?: number;
    gk?: number;
  };
  schedule_date?: string;
  schedule_time?: string;
  auto_submit?: boolean;
  proctoring_enabled?: boolean;
  result_declaration_date?: string;
  instructions?: string;
  attempt_limits?: number; // 1, 2, unlimited (-1)
  partial_marking?: boolean;
  subject_cutoffs?: {
    maths: number;
    reasoning: number;
    science: number;
    gk: number;
  };
  is_premium: boolean;
  is_active: boolean;
  is_private?: boolean; // link-only tests
  pause_resume_enabled?: boolean;
  test_series_id?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Question type with difficulty, tags, images, LaTeX
export interface Question {
  id: string;
  exam_id?: string;
  category_node_id?: string;
  subject: string;
  topic?: string; // "Maths > Profit & Loss"
  subtopic?: string;
  question_text: string;
  options: string[];
  option_images?: string[]; // URLs for option images
  option_label_style?: 'alphabet' | 'numeric';
  correct_index: number;
  explanation?: string;
  video_explanation_url?: string; // YouTube or video link
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[]; // ["RRB NTPC 2021", "Previous Year"]
  image_url?: string; // Question image URL
  marks: number;
  negative_marks?: number;
  order?: number;
  is_draft?: boolean;
  version?: number;
  previous_versions?: string[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// Enhanced QuizAttempt with device info, proctoring
export interface QuizAttempt {
  id: string;
  user_id: string;
  exam_id: string;
  answers: {
    questionId: string;
    selectedOption: number;
    correctOption?: number;
    is_correct?: boolean;
    time_spent_seconds?: number;
    skipped?: boolean;
    question_text?: string;
    question_image_url?: string;
    option_text?: string[];
    option_images?: string[];
    option_label_style?: 'alphabet' | 'numeric';
    subject?: string;
    marks?: number;
    negative_marks?: number;
  }[];
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  started_at: string;
  submitted_at: string;
  subject_wise_scores?: { [subject: string]: { correct: number; total: number } };
  device_info?: {
    type: 'mobile' | 'desktop';
    browser: string;
    os: string;
  };
  ip_address?: string;
  tab_switches?: number;
  is_flagged?: boolean;
  status?: 'in_progress' | 'completed' | 'paused';
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

// New types for Pro Education System
export interface TestSeries {
  id: string;
  title: string;
  description?: string;
  exam_ids: string[];
  price: number;
  discount_percentage?: number;
  is_active: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number;
  used_count: number;
  valid_until: string;
  is_active: boolean;
  applicable_plans?: string[];
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  amount: number;
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  payment_id: string;
  coupon_used?: string;
  created_at: string;
}

export interface Doubt {
  id: string;
  user_id: string;
  question_id: string;
  attempt_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  admin_response?: string;
  created_at: string;
  updated_at: string;
}

export interface CMSSetting {
  id: string;
  key: string; // "home_banner", "faq", "footer_links", etc.
  value: any;
  updated_by: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  notification_group_id?: string;
  audience?: 'global' | 'selected';
  recipient_name?: string;
  sent_by?: string;
  title: string;
  message: string;
  type: 'test_live' | 'result_declared' | 'payment' | 'system';
  is_read: boolean;
  is_push?: boolean;
  action_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role?: 'admin' | 'student';
  is_premium?: boolean;
  premium_until?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProctoringLog {
  id: string;
  attempt_id: string;
  user_id: string;
  device_info: any;
  ip_address: string;
  events: Array<{ type: string; timestamp: string; details?: any }>;
  tab_switch_count: number;
  violation_count: number;
  created_at: string;
}

export interface CategoryNode {
  id: string;
  category_id: string;
  parent_id?: string | null;
  name: string;
  level: number;
  order?: number;
  is_active: boolean;
  is_test_container?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryLink {
  id: string;
  category_id: string;
  category_node_id?: string | null;
  type: 'whatsapp_channel';
  title: string;
  url: string;
  is_active: boolean;
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

// Category tree nodes
export const categoryNodesRef = collection(db, 'category_nodes');

export const getCategoryNodes = async (categoryId: string, parentId?: string | null) => {
  const constraints = [
    where('category_id', '==', categoryId),
    where('parent_id', '==', parentId ?? null),
    where('is_active', '==', true),
    orderBy('order', 'asc'),
  ];
  const snapshot = await getDocs(query(categoryNodesRef, ...constraints));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryNode));
};

export const createCategoryNode = async (data: Omit<CategoryNode, 'id' | 'created_at' | 'updated_at'>) => {
  const docRef = await addDoc(categoryNodesRef, {
    ...data,
    parent_id: data.parent_id ?? null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
};

export const updateCategoryNode = async (nodeId: string, data: Partial<CategoryNode>) => {
  await updateDoc(doc(db, 'category_nodes', nodeId), {
    ...data,
    updated_at: serverTimestamp(),
  });
};

export const deleteCategoryNode = async (nodeId: string) => {
  await deleteDoc(doc(db, 'category_nodes', nodeId));
};

// Category Links
export const categoryLinksRef = collection(db, 'category_links');

export const getCategoryLinks = async (categoryId: string, categoryNodeId?: string | null) => {
  const snapshot = await getDocs(
    query(
      categoryLinksRef,
      where('category_id', '==', categoryId),
      where('category_node_id', '==', categoryNodeId ?? null),
      where('is_active', '==', true),
      orderBy('updated_at', 'desc')
    )
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as CategoryLink));
};

export const upsertCategoryLink = async (data: Omit<CategoryLink, 'id' | 'created_at' | 'updated_at'>) => {
  const existing = await getCategoryLinks(data.category_id, data.category_node_id ?? null);
  if (existing[0]) {
    await updateDoc(doc(db, 'category_links', existing[0].id), {
      ...data,
      category_node_id: data.category_node_id ?? null,
      updated_at: serverTimestamp(),
    });
    return existing[0].id;
  }

  const docRef = await addDoc(categoryLinksRef, {
    ...data,
    category_node_id: data.category_node_id ?? null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
};

export const deleteCategoryLink = async (linkId: string) => {
  await deleteDoc(doc(db, 'category_links', linkId));
};

// Exams
export const examsRef = collection(db, 'exams');

export const getExams = async (categoryId?: string, includeInactive: boolean = false) => {
  let q;
  if (categoryId) {
    q = includeInactive
      ? query(examsRef, where('category_id', '==', categoryId), orderBy('created_at', 'desc'))
      : query(examsRef, where('category_id', '==', categoryId), where('is_active', '==', true));
  } else {
    q = includeInactive ? query(examsRef, orderBy('created_at', 'desc')) : query(examsRef, where('is_active', '==', true));
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

export const getQuestion = async (questionId: string) => {
  const docRef = doc(db, 'questions', questionId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Question;
  }
  return null;
};

export const getAllQuestions = async () => {
  const q = query(questionsRef, orderBy('created_at', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
};

export const getQuestionsByCategoryNode = async (categoryNodeId: string) => {
  const q = query(questionsRef, where('category_node_id', '==', categoryNodeId));
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

export const getAllAttempts = async () => {
  const q = query(attemptsRef, orderBy('submitted_at', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
};

export const getAttemptsByExam = async (examId: string) => {
  const q = query(
    attemptsRef,
    where('exam_id', '==', examId),
    orderBy('submitted_at', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
};

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
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
};

export const getUserProfile = async (userId: string) => {
  const snapshot = await getDoc(doc(db, 'profiles', userId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as UserProfile;
};

export const notificationsRef = collection(db, 'notifications');

export const getUserNotifications = async (userId: string) => {
  const snapshot = await getDocs(
    query(notificationsRef, where('user_id', '==', userId), orderBy('created_at', 'desc'))
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Notification));
};

export const createNotifications = async (
  notifications: Omit<Notification, 'id' | 'created_at' | 'updated_at'>[]
) => {
  await Promise.all(
    notifications.map((notification) =>
      addDoc(notificationsRef, {
        ...notification,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
    )
  );
};

export const markNotificationRead = async (notificationId: string) => {
  await updateDoc(doc(db, 'notifications', notificationId), {
    is_read: true,
    updated_at: serverTimestamp(),
  });
};

export const updateNotification = async (notificationId: string, data: Partial<Notification>) => {
  await updateDoc(doc(db, 'notifications', notificationId), {
    ...data,
    updated_at: serverTimestamp(),
  });
};

export const deleteNotification = async (notificationId: string) => {
  await deleteDoc(doc(db, 'notifications', notificationId));
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
