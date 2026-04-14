const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC9SaZc8FIdGnf6y38vWeY33CXXJg7qhaI',
  authDomain: 'railway-study-point-7513c.firebaseapp.com',
  projectId: 'railway-study-point-7513c',
  storageBucket: 'railway-study-point-7513c.firebasestorage.app',
  messagingSenderId: '650911343382',
  appId: '1:650911343382:web:b4e8d8ab8f48ffa1d8a637',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  try {
    const email = `test${Date.now()}@test.com`;
    console.log('Testing creating user: ', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, 'password123');
    console.log('User created:', userCredential.user.uid);

    console.log('Testing Firestore setDoc...');
    await setDoc(doc(db, 'profiles', userCredential.user.uid), {
      id: userCredential.user.uid,
      email: email,
      full_name: 'Test User',
      role: 'student',
      is_premium: false,
      avatar_url: 'https://test.com/avatar.png',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log('Profile created successfully');
    
  } catch (error) {
    console.error('ERROR OCCURRED:', error.code, error.message);
  }
}

test();
