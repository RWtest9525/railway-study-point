import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { 
  FileText, 
  PlusCircle, 
  DollarSign, 
  LogOut, 
  Settings, 
  Users, 
  MessageSquare, 
  Database,
  LayoutDashboard,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { QuestionBank } from './QuestionBank';
import { ExamCreator } from './ExamCreator';
import { RevenueTracker } from './RevenueTracker';
import { PremiumSettings } from './PremiumSettings';
import { UserManagement } from './UserManagement';
import { SupportInbox } from './SupportInbox';
import { loadDemoData } from '../../lib/demoData';

export function AdminPortal() {
  const { profile, signOut } = useAuth();
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<
    'questions' | 'exams' | 'revenue' | 'premium' | 'users' | 'support' | 'system'
  >('questions');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleLoadDemo = async () => {
    if (!profile?.id) return;
    if (!confirm('This will add sample questions and exams to your database. Continue?')) return;
    setDemoLoading(true);
    const res = await loadDemoData(profile.id);
    setDemoLoading(false);
    if (res.success) {
      setDemoMessage('Demo data loaded successfully! Refreshing...');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      setDemoMessage('Failed to load demo data.');
    }
  };

  const mainTabs = [
    { id: 'questions' as const, name: 'Questions', icon: FileText, desc: 'Manage Question Bank' },
    { id: 'exams' as const, name: 'Exams', icon: PlusCircle, desc: 'Create & Edit Exams' },
    { id: 'support' as const, name: 'Support', icon: MessageSquare, desc: 'Student Help Tickets' },
  ];

  const managementTabs = [
    { id: 'revenue' as const, name: 'Revenue', icon: DollarSign, desc: 'Track Payments' },
    { id: 'users' as const, name: 'Users', icon: Users, desc: 'Manage All Students' },
    { id: 'premium' as const, name: 'Premium', icon: ShieldCheck, desc: 'Price & Validity' },
    { id: 'system' as const, name: 'System', icon: Settings, desc: 'Maintenance' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-gray-800 border-r border-gray-700 flex flex-col shrink-0 z-[100]">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <BrandLogo variant="nav" className="bg-white/5 ring-1 ring-white/10 shadow-md w-8 h-8" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white leading-tight truncate">Railway Admin</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Control Panel</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          {/* Core Section */}
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Core Features</h3>
            <div className="space-y-1">
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <span className="text-sm font-semibold">{tab.name}</span>
                  {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Management Section */}
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Management</h3>
            <div className="space-y-1">
              {managementTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <span className="text-sm font-semibold">{tab.name}</span>
                  {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="bg-gray-900/50 rounded-xl p-3 mb-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{profile?.full_name || 'Admin'}</p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
              >
                <LayoutDashboard className="w-3 h-3" /> Dashboard
              </button>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-400/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-900/50">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 lg:p-12">
          {/* Active Tab Component */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'questions' && <QuestionBank />}
            {activeTab === 'exams' && <ExamCreator />}
            {activeTab === 'revenue' && <RevenueTracker />}
            {activeTab === 'premium' && <PremiumSettings />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'support' && <SupportInbox />}
            
            {activeTab === 'system' && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Database className="w-8 h-8 text-amber-400" />
                    System Maintenance
                  </h2>
                  <p className="text-gray-400 text-sm">Perform administrative tasks and database maintenance.</p>
                </div>

                <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">Load Demo Content</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        Populate your database with sample questions and exams for categories like ALP, NTPC, and Group-D. 
                        Useful for testing the student dashboard appearance.
                      </p>
                    </div>
                    <button
                      onClick={handleLoadDemo}
                      disabled={demoLoading}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 transition shadow-lg shadow-amber-900/20 shrink-0"
                    >
                      {demoLoading ? 'Loading...' : 'Load Demo Data'}
                    </button>
                  </div>

                  {demoMessage && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${
                      demoMessage.includes('success') ? 'bg-green-600/10 text-green-400 border border-green-500/20' : 'bg-red-600/10 text-red-400 border border-red-500/20'
                    }`}>
                      {demoMessage}
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-2">Platform Version</h3>
                    <div className="bg-gray-900/50 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Railway Study Point v2.0</span>
                      <span className="text-green-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        System Online
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
