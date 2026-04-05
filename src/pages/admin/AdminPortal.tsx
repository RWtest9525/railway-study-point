import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { 
  FileText, 
  PlusCircle, 
  DollarSign, 
  LogOut, 
  Users, 
  MessageSquare, 
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  Folder
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { QuestionBank } from './QuestionBank';
import { ExamCreator } from './ExamCreator';
import { RevenueTracker } from './RevenueTracker';
import { PremiumSettings } from './PremiumSettings';
import { UserManagement } from './UserManagement';
import { SupportInbox } from './SupportInbox';
import { SubscriptionManagement } from './SubscriptionManagement';
import { CategoryManagement } from './CategoryManagement';

export function AdminPortal() {
  const { profile, signOut } = useAuth();
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<
    'questions' | 'exams' | 'revenue' | 'premium' | 'users' | 'support' | 'subscription' | 'categories'
  >('users');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
    { id: 'subscription' as const, name: 'Subscription', icon: CreditCard, desc: 'User Subscriptions' },
    { id: 'categories' as const, name: 'Categories', icon: Folder, desc: 'Exam Categories' },
  ];

  const handleTabClick = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setIsMenuOpen(false); // Close menu on mobile after selection
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col md:flex-row relative">
      {/* Mobile Header with Hamburger */}
      <div className="md:hidden bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between sticky top-0 z-[150]">
        <div className="flex items-center gap-3">
          <BrandLogo variant="nav" className="bg-white/5 ring-1 ring-white/10 shadow-md w-8 h-8" />
          <span className="text-sm font-bold text-white">Railway Admin</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-gray-400 hover:text-white transition"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[140] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 flex flex-col shrink-0 z-[150] transition-transform duration-300 transform
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-[100]
      `}>
        <div className="p-6 border-b border-gray-700 hidden md:flex items-center gap-3">
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
                  onClick={() => handleTabClick(tab.id)}
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
                  onClick={() => handleTabClick(tab.id)}
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
            {activeTab === 'subscription' && <SubscriptionManagement />}
            {activeTab === 'categories' && <CategoryManagement />}
          </div>
        </div>
      </main>
    </div>
  );
}
