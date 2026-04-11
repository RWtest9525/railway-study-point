import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { LayoutDashboard, BookOpen, FileText, Users, IndianRupee, Plus, Trash2, FolderSync, ChevronRight, CheckCircle2 } from 'lucide-react';

export const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data stores
  const [categories, setCategories] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // Form states
  const [newCat, setNewCat] = useState('');
  const [newExam, setNewExam] = useState({ title: '', categoryId: '', duration: '60', negativeMark: '0.25' });
  
  const [newQuestion, setNewQuestion] = useState({
    categoryId: '',
    examId: '', 
    text: '',
    opt1: '',
    opt2: '',
    opt3: '',
    opt4: '',
    correct: '1',
    explanation: ''
  });

  const [loadingAction, setLoadingAction] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    try {
      const catsSnap = await getDocs(collection(db, 'categories'));
      setCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const examsSnap = await getDocs(collection(db, 'exams'));
      setExams(examsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const qSnap = await getDocs(collection(db, 'questions'));
      setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Handlers
  const handleAddCategory = async () => {
    if (!newCat.trim()) return alert("Enter folder name");
    setLoadingAction(true);
    await addDoc(collection(db, 'categories'), { name: newCat, createdAt: serverTimestamp() });
    alert("Category Folder created!");
    setNewCat('');
    fetchData();
    setLoadingAction(false);
  };

  const handleCreateExam = async () => {
    if (!newExam.title || !newExam.categoryId) return alert("Please fill title and select a category folder");
    setLoadingAction(true);
    await addDoc(collection(db, 'exams'), { 
      title: newExam.title, 
      categoryId: newExam.categoryId, 
      duration: newExam.duration,
      negativeMark: newExam.negativeMark,
      createdAt: serverTimestamp() 
    });
    alert("Exam Created Successfully!");
    setNewExam({ title: '', categoryId: '', duration: '60', negativeMark: '0.25' });
    fetchData();
    setLoadingAction(false);
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.categoryId) return alert("Please select a Category Folder!");
    if (!newQuestion.text || !newQuestion.opt1 || !newQuestion.opt2) return alert("Question text and at least 2 options are required!");
    
    setLoadingAction(true);
    
    // Fallbacks to avoid "undefined" errors in Firestore
    const dataToSave = {
      categoryId: newQuestion.categoryId || null,
      examId: newQuestion.examId || null, 
      exam_id: newQuestion.examId || null, // legacy support
      text: newQuestion.text,
      opt1: newQuestion.opt1,
      opt2: newQuestion.opt2,
      opt3: newQuestion.opt3,
      opt4: newQuestion.opt4,
      correct: newQuestion.correct,
      explanation: newQuestion.explanation || '',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'questions'), dataToSave);
      alert("Question Added Successfully!");
      setNewQuestion({ ...newQuestion, text: '', opt1: '', opt2: '', opt3: '', opt4: '', explanation: '' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Error adding question: " + err.message);
    }
    setLoadingAction(false);
  };

  const deleteDocItem = async (collectionName: string, id: string) => {
    if(!confirm("Are you sure you want to delete this?")) return;
    await deleteDoc(doc(db, collectionName, id));
    fetchData();
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-white font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-800/80 backdrop-blur border-r border-slate-700/50 h-screen sticky top-0 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            ADMIN PRO
          </h1>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'categories', icon: FolderSync, label: 'Category Folders' },
            { id: 'exams', icon: FileText, label: 'Manage Exams' },
            { id: 'questions', icon: BookOpen, label: 'Question Bank' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`flex items-center w-full p-4 rounded-xl transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 shadow-lg shadow-indigo-900/40 text-white font-bold translate-x-2' 
                  : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
              }`}
            >
              <tab.icon className={`mr-4 w-5 h-5 ${activeTab === tab.id ? 'text-indigo-200' : 'text-slate-400'}`}/> 
              {tab.label}
              {activeTab === tab.id && <ChevronRight className="ml-auto w-4 h-4 opacity-50"/>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-white capitalize flex items-center gap-3">
            {activeTab.replace('-', ' ')}
          </h2>
          <p className="text-slate-400 mt-2">Manage your platform efficiently</p>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition"></div>
              <Users className="text-blue-400 w-8 h-8 mb-4"/> 
              <p className="text-slate-400 font-medium text-sm uppercase tracking-wide">Total Students</p>
              <h3 className="text-4xl font-black mt-2">240+</h3>
            </div>
            
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition"></div>
              <FileText className="text-green-400 w-8 h-8 mb-4"/> 
              <p className="text-slate-400 font-medium text-sm uppercase tracking-wide">Active Exams</p>
              <h3 className="text-4xl font-black mt-2">{exams.length}</h3>
            </div>
            
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition"></div>
              <IndianRupee className="text-yellow-400 w-8 h-8 mb-4"/> 
              <p className="text-slate-400 font-medium text-sm uppercase tracking-wide">Revenue Monthly</p>
              <h3 className="text-4xl font-black mt-2">₹12,400</h3>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700/50 shadow-xl">
              <h3 className="text-xl font-bold mb-6 text-cyan-400 flex items-center"><FolderSync className="mr-2"/> Create Category Folder</h3>
              <p className="text-sm text-slate-400 mb-6">Create folders like "NTPC", "ALP", or subjects to organize your questions.</p>
              <div className="flex gap-4">
                <input 
                  placeholder="e.g. RRB Technician 2024" 
                  className="flex-1 bg-slate-900/50 p-4 rounded-xl border border-slate-700 outline-none focus:border-cyan-500 transition" 
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)} 
                />
                <button 
                  onClick={handleAddCategory} 
                  disabled={loadingAction}
                  className="bg-cyan-600 hover:bg-cyan-500 px-6 rounded-xl font-bold transition shadow-lg shadow-cyan-900/30 flex items-center"
                >
                  <Plus className="w-5 h-5 mr-1"/> Add
                </button>
              </div>
            </div>

            <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700/50 shadow-xl max-h-[600px] overflow-y-auto">
              <h3 className="text-xl font-bold mb-6 text-white">Existing Folders</h3>
              <div className="space-y-3">
                {categories.length === 0 && <p className="text-slate-500 italic">No folders created yet.</p>}
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl border border-slate-700/30 hover:border-slate-600 transition">
                    <span className="font-semibold text-slate-200 flex items-center gap-2"><FolderSync className="text-cyan-500 w-4 h-4"/> {cat.name}</span>
                    <button onClick={() => deleteDocItem('categories', cat.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded-lg transition"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700/50 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-indigo-400">Create Mock Test</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Link to Category Folder</label>
                  <select 
                    className="w-full bg-slate-900/50 p-4 rounded-xl border border-slate-700 outline-none focus:border-indigo-500 transition text-white" 
                    value={newExam.categoryId}
                    onChange={e => setNewExam({...newExam, categoryId: e.target.value})}
                  >
                    <option value="">-- Select Folder --</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Exam Title</label>
                  <input placeholder="e.g. CBT 1 Full Mock" className="w-full bg-slate-900/50 p-4 rounded-xl border border-slate-700 outline-none focus:border-indigo-500 transition" value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Duration (Mins)</label>
                    <input type="number" className="w-full bg-slate-900/50 p-4 rounded-xl border border-slate-700 outline-none focus:border-indigo-500" value={newExam.duration} onChange={e => setNewExam({...newExam, duration: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Negative Marks</label>
                    <input type="number" step="0.01" className="w-full bg-slate-900/50 p-4 rounded-xl border border-slate-700 outline-none focus:border-indigo-500" value={newExam.negativeMark} onChange={e => setNewExam({...newExam, negativeMark: e.target.value})} />
                  </div>
                </div>

                <button onClick={handleCreateExam} disabled={loadingAction} className="w-full bg-indigo-600 hover:bg-indigo-500 p-4 rounded-xl font-bold flex justify-center items-center transition shadow-lg shadow-indigo-900/30 text-lg mt-4">
                  <CheckCircle2 className="mr-2"/> Create Exam
                </button>
              </div>
            </div>

            <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700/50 shadow-xl max-h-[700px] overflow-y-auto">
              <h3 className="text-xl font-bold mb-6 text-white">Live Exams</h3>
              <div className="space-y-4">
                {exams.length === 0 && <p className="text-slate-500 italic">No exams created.</p>}
                {exams.map(ex => {
                  const catName = categories.find(c => c.id === ex.categoryId)?.name || 'Unknown Category';
                  return (
                    <div key={ex.id} className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700 hover:border-indigo-500/50 transition relative overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg text-white">{ex.title}</h4>
                        <button onClick={() => deleteDocItem('exams', ex.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4"/></button>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md">{catName}</span>
                        <span className="bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md">{ex.duration} Mins</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700/50 shadow-xl max-w-4xl mx-auto">
             <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-700">
               <div>
                 <h2 className="text-2xl font-bold text-green-400">Add to Question Bank</h2>
                 <p className="text-slate-400 text-sm mt-1">Upload questions to a Folder (and optionally into a specific Exam)</p>
               </div>
               <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-xl text-sm font-bold border border-green-500/20">
                 Total Qs: {questions.length}
               </div>
             </div>

             <div className="grid md:grid-cols-2 gap-6 mb-8">
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase mb-2 block text-green-400">* Select Category Folder</label>
                 <select className="w-full bg-slate-900 p-4 rounded-xl border border-green-500/30 outline-none focus:border-green-500 transition" value={newQuestion.categoryId} onChange={e => setNewQuestion({...newQuestion, categoryId: e.target.value})}>
                    <option value="">-- Mandatory: Select Folder --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Assign to Exam (Optional)</label>
                 <select className="w-full bg-slate-900 p-4 rounded-xl border border-slate-700 outline-none focus:border-green-500 transition" value={newQuestion.examId} onChange={e => setNewQuestion({...newQuestion, examId: e.target.value})}>
                    <option value="">-- No specific exam (Bank only) --</option>
                    {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                 </select>
               </div>
             </div>

             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Question Text</label>
             <textarea placeholder="Write question here..." className="bg-slate-900 p-4 w-full mb-6 rounded-xl border border-slate-700 outline-none focus:border-green-500 transition min-h-[120px]" onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} value={newQuestion.text}/>
             
             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Options</label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="relative">
                    <span className="absolute left-4 top-4 text-slate-500 font-bold">{num}.</span>
                    <input 
                      placeholder={`Option ${num}`} 
                      className={`bg-slate-900 pl-10 pr-4 py-4 w-full rounded-xl outline-none transition border ${newQuestion.correct === num.toString() ? 'border-green-500 bg-green-500/5' : 'border-slate-700 focus:border-slate-500'}`}
                      onChange={e => setNewQuestion({...newQuestion, [`opt${num}`]: e.target.value})} 
                      value={(newQuestion as any)[`opt${num}`]} 
                    />
                  </div>
                ))}
             </div>

             <div className="grid md:grid-cols-2 gap-6 mb-8">
               <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block text-green-400">Correct Option Number</label>
                  <select className="w-full bg-slate-900 p-4 rounded-xl border border-slate-700 outline-none focus:border-green-500" value={newQuestion.correct} onChange={e => setNewQuestion({...newQuestion, correct: e.target.value})}>
                     <option value="1">Option 1</option>
                     <option value="2">Option 2</option>
                     <option value="3">Option 3</option>
                     <option value="4">Option 4</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Explanation (Optional)</label>
                  <input placeholder="Short explanation text..." className="bg-slate-900 p-4 w-full rounded-xl border border-slate-700 outline-none focus:border-green-500" onChange={e => setNewQuestion({...newQuestion, explanation: e.target.value})} value={newQuestion.explanation}/>
               </div>
             </div>

             <button onClick={handleAddQuestion} disabled={loadingAction} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 p-4 rounded-xl font-black text-white text-lg transition shadow-xl shadow-green-900/30 flex justify-center items-center">
                <Plus className="mr-2"/> SAVE TO DATABASE
             </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPortal;