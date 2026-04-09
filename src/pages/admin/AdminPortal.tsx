import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { LayoutDashboard, BookOpen, FileText, Users, IndianRupee, Plus, Trash2 } from 'lucide-react';

const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [exams, setExams] = useState<any[]>([]);
  const [newExam, setNewExam] = useState({ title: '', category: '', duration: '', negativeMark: '0.25' });
  const [newQuestion, setNewQuestion] = useState({ examId: '', text: '', opt1: '', opt2: '', opt3: '', opt4: '', correct: '1' });

  const fetchExams = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'exams'));
      setExams(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error("Error fetching exams:", err); }
  };

  useEffect(() => { fetchExams(); }, []);

  const handleCreateExam = async () => {
    if (!newExam.title) return alert("Please enter Exam Title");
    await addDoc(collection(db, 'exams'), { ...newExam, createdAt: new Date() });
    alert("Exam Created Successfully!");
    fetchExams();
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.examId) return alert("Select an Exam first!");
    if (!newQuestion.text) return alert("Question text is empty");
    await addDoc(collection(db, 'questions'), { ...newQuestion, createdAt: new Date() });
    alert("Question Added to Bank!");
    setNewQuestion({ ...newQuestion, text: '', opt1: '', opt2: '', opt3: '', opt4: '' });
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* Fixed Sidebar */}
      <aside className="w-64 bg-slate-800 p-6 border-r border-slate-700 h-screen sticky top-0">
        <h1 className="text-xl font-bold text-indigo-400 mb-10">RAILWAY ADMIN PRO</h1>
        <nav className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center w-full p-3 rounded ${activeTab === 'dashboard' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}><LayoutDashboard className="mr-3"/> Dashboard</button>
          <button onClick={() => setActiveTab('exams')} className={`flex items-center w-full p-3 rounded ${activeTab === 'exams' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}><FileText className="mr-3"/> Manage Exams</button>
          <button onClick={() => setActiveTab('questions')} className={`flex items-center w-full p-3 rounded ${activeTab === 'questions' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}><BookOpen className="mr-3"/> Question Bank</button>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700"><Users className="text-blue-400 mb-2"/> <p className="text-gray-400 font-medium">Total Students</p><h3 className="text-3xl font-bold">120+</h3></div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700"><FileText className="text-green-400 mb-2"/> <p className="text-gray-400 font-medium">Active Exams</p><h3 className="text-3xl font-bold">{exams.length}</h3></div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700"><IndianRupee className="text-yellow-400 mb-2"/> <p className="text-gray-400 font-medium">Revenue</p><h3 className="text-3xl font-bold">₹3,400</h3></div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-indigo-300">Create New Mock Test</h2>
            <div className="space-y-4">
              <input placeholder="Exam Title (e.g. NTPC Mock 1)" className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 outline-none focus:border-indigo-500" onChange={e => setNewExam({...newExam, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-slate-700 p-3 rounded-lg border border-slate-600" onChange={e => setNewExam({...newExam, category: e.target.value})}>
                  <option>Select Category</option><option value="ALP">ALP</option><option value="NTPC">NTPC</option><option value="GROUP-D">Group D</option>
                </select>
                <input placeholder="Duration (min)" type="number" className="bg-slate-700 p-3 rounded-lg border border-slate-600" onChange={e => setNewExam({...newExam, duration: e.target.value})} />
              </div>
              <button onClick={handleCreateExam} className="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-lg font-bold flex justify-center items-center transition"><Plus className="mr-2"/> Create Now</button>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl max-w-4xl">
             <h2 className="text-2xl font-bold mb-6 text-green-400">Add Questions to Bank</h2>
             <select className="bg-slate-700 p-3 w-full mb-6 rounded-lg border border-slate-600" onChange={e => setNewQuestion({...newQuestion, examId: e.target.value})}>
                <option>Select Exam (Where to add?)</option>
                {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title} ({ex.category})</option>)}
             </select>
             <textarea placeholder="Type Question here..." className="bg-slate-700 p-3 w-full mb-4 rounded-lg border border-slate-600 min-h-[100px]" onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} value={newQuestion.text}/>
             <div className="grid grid-cols-2 gap-4 mb-6">
                <input placeholder="Option 1" className="bg-slate-700 p-3 rounded-lg border border-slate-600" onChange={e => setNewQuestion({...newQuestion, opt1: e.target.value})} value={newQuestion.opt1} />
                <input placeholder="Option 2" className="bg-slate-700 p-3 rounded-lg border border-slate-600" onChange={e => setNewQuestion({...newQuestion, opt2: e.target.value})} value={newQuestion.opt2} />
                <input placeholder="Option 3" className="bg-slate-700 p-3 rounded-lg border border-slate-600" onChange={e => setNewQuestion({...newQuestion, opt3: e.target.value})} value={newQuestion.opt3} />
                <input placeholder="Option 4" className="bg-slate-700 p-3 rounded-lg border border-slate-600" onChange={e => setNewQuestion({...newQuestion, opt4: e.target.value})} value={newQuestion.opt4} />
             </div>
             <button onClick={handleAddQuestion} className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-lg font-bold text-lg transition">Save Question</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPortal;