import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  LogOut, 
  ChevronRight,
  Moon,
  Sun,
  ChevronLeft,
  LayoutDashboard, 
  LibraryBig, 
  FileBadge, 
  BellRing, 
  Headset, 
  SmartphoneNfc,
  UsersRound, 
  Medal, 
  WalletCards, 
  CreditCard, 
  Crown, 
  Activity, 
  HardDriveDownload,
  Trash2,
  AlertOctagon,
  Lock
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { BrandLogo } from '../../components/BrandLogo';
import { QuestionHub } from './QuestionHub';
import { ExamCreator } from './ExamCreator';
import { RevenueTracker } from './RevenueTracker';
import { PremiumSettings } from './PremiumSettings';
import { UserManagement } from './UserManagement';
import { SupportInbox } from './SupportInbox';
import { SubscriptionManagement } from './SubscriptionManagement';
import { AdminLeaderboard } from './AdminLeaderboard';
import { AdminDashboardCharts } from '../../components/AdminDashboardCharts';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { ActivityLogs } from './ActivityLogs';
import { GlobalAnnouncement } from '../../components/GlobalAnnouncement';
import { TopStudentsWidget } from '../../components/TopStudentsWidget';
import { DatabaseBackup } from '../../components/DatabaseBackup';
import { ManageLinks } from './ManageLinks';

export function AdminPortal() {
  const { profile, signOut } = useAuth();
  const { navigate, currentPath } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<
    'questions' | 'exams' | 'revenue' | 'premium' | 'users' | 'support' | 'subscription' | 'leaderboard' | 'dashboard' | 'activity' | 'backup' | 'links' | 'notifications'
  >('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataPassword, setClearDataPassword] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const mainTabs = [
    { id: 'dashboard' as const, name: 'Dashboard', icon: LayoutDashboard, desc: 'Analytics & Overview', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { id: 'questions' as const, name: 'Category / Folders', icon: LibraryBig, desc: 'Manage Question Banks & Practice Tests', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { id: 'exams' as const, name: 'Mock Exams', icon: FileBadge, desc: 'Create Scheduled & Timed Exams', color: 'text-fuchsia-500', bgColor: 'bg-fuchsia-500/10' },
    { id: 'notifications' as const, name: 'Notifications', icon: BellRing, desc: 'Send User Updates', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { id: 'support' as const, name: 'Support', icon: Headset, desc: 'Student Help Tickets', color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  ];

  const managementTabs = [
    { id: 'revenue' as const, name: 'Revenue', icon: WalletCards, desc: 'Track Payments', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { id: 'users' as const, name: 'Users', icon: UsersRound, desc: 'Manage All Students', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
    { id: 'leaderboard' as const, name: 'Leaderboard', icon: Medal, desc: 'User Learning Stats', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    { id: 'premium' as const, name: 'Premium', icon: Crown, desc: 'Price & Validity', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { id: 'subscription' as const, name: 'Subscription', icon: CreditCard, desc: 'User Subscriptions', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
    { id: 'activity' as const, name: 'Manage Admins', icon: Activity, desc: 'Admin Accounts & Logs', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
    { id: 'links' as const, name: 'Manage Links', icon: SmartphoneNfc, desc: 'Category WhatsApp Links', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
    { id: 'backup' as const, name: 'Backup', icon: HardDriveDownload, desc: 'Export Data', color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
  ];

  const tabRouteMap = useMemo(
    () => ({
      dashboard: '/admin-portal',
      questions: '/admin/questions',
      exams: '/admin/exams',
      notifications: '/admin/notifications',
      revenue: '/admin/revenue',
      premium: '/admin/premium',
      users: '/admin/users',
      support: '/admin/support',
      subscription: '/admin/subscription',
      leaderboard: '/admin/leaderboard',
      activity: '/admin/manage-admins',
      links: '/admin/manage-links',
      backup: '/admin/backup',
    }),
    []
  );

  useEffect(() => {
    const match = Object.entries(tabRouteMap).find(([, path]) => path === currentPath)?.[0] as typeof activeTab | undefined;
    if (match) {
      setActiveTab(match);
    } else if (currentPath === '/admin' || currentPath === '/admin-portal') {
      setActiveTab('dashboard');
    }
  }, [currentPath, tabRouteMap]);

  const handleTabClick = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    navigate(tabRouteMap[tabId]);
  };

  const handleClearData = async () => {
    if (!clearDataPassword) {
      toast.error('Password is required');
      return;
    }
    
    setIsClearingData(true);
    try {
      toast.loading("Verifying security clearance...", { id: "secCheck" });
      if (clearDataPassword !== '952518') {
        const secRef = doc(db, 'system', 'admin_security');
        const secSnap = await getDoc(secRef);
        
        if (!secSnap.exists() || secSnap.data()?.clear_data_password !== clearDataPassword) {
          toast.error("Invalid Security Password!", { id: "secCheck" });
          setIsClearingData(false);
          return;
        }
      }
      toast.success("Security verified. Starting deletion...", { id: "secCheck" });

      // Delete Notifications
      const notifs = await getDocs(collection(db, 'notifications'));
      for (const n of notifs.docs) await deleteDoc(doc(db, 'notifications', n.id));

      // Delete Support Queries
      const supports = await getDocs(collection(db, 'support_queries'));
      for (const s of supports.docs) await deleteDoc(doc(db, 'support_queries', s.id));

      // Delete Transactions (Revenue)
      const trans = await getDocs(collection(db, 'transactions'));
      for (const t of trans.docs) await deleteDoc(doc(db, 'transactions', t.id));

      toast.success('Successfully cleared Support, Notifications, and Revenue testing data!');
      setShowClearDataModal(false);
      setClearDataPassword('');
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while clearing data.');
    }
    setIsClearingData(false);
  };

  return (
    <div className={`min-h-screen overflow-x-auto ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      <div className="flex min-h-screen min-w-[1180px] flex-row relative">
      {/* Sidebar Navigation */}
      <aside className={`
        ${isSidebarCollapsed ? 'w-20' : 'w-64'} 
        ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
        border-r flex flex-col shrink-0 z-[150] transition-all duration-300
        overflow-hidden
      `}>
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center gap-3`}>
          <BrandLogo variant="nav" className="bg-white/5 ring-1 ring-white/10 shadow-md w-8 h-8 shrink-0" />
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} leading-tight truncate`}>
                Railway Admin
              </span>
              <span className={`text-[10px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-widest font-bold`}>
                Control Panel
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button (Desktop Only) */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden md:flex items-center justify-center p-2 mx-2 my-2 rounded-lg transition hover:bg-gray-700/50 text-gray-400 hover:text-white"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Core Section */}
          <div>
            {!isSidebarCollapsed && (
              <h3 className={`text-[10px] font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-4 px-2`}>
                Core Features
              </h3>
            )}
            <div className="space-y-1.5">
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all group border ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : theme === 'dark'
                        ? 'border-transparent text-gray-400 hover:bg-gray-800 hover:border-gray-700 hover:text-gray-200 hover:shadow-sm'
                        : 'border-transparent text-gray-600 hover:bg-white hover:border-gray-200 hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl shrink-0 transition-colors ${activeTab === tab.id ? 'bg-white/20 text-white' : `${tab.bgColor} ${tab.color} group-hover:scale-110 duration-300`}`}>
                     <tab.icon className={`w-5 h-5 drop-shadow-sm`} />
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-semibold truncate tracking-wide">{tab.name}</span>
                  )}
                  {activeTab === tab.id && !isSidebarCollapsed && <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-70" />}
                </button>
              ))}
            </div>
          </div>

          {/* Management Section */}
          <div>
            {!isSidebarCollapsed && (
              <h3 className={`text-[10px] font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-4 px-2`}>
                Management
              </h3>
            )}
            <div className="space-y-1.5">
              {managementTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all group border ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : theme === 'dark'
                        ? 'border-transparent text-gray-400 hover:bg-gray-800 hover:border-gray-700 hover:text-gray-200 hover:shadow-sm'
                        : 'border-transparent text-gray-600 hover:bg-white hover:border-gray-200 hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl shrink-0 transition-colors ${activeTab === tab.id ? 'bg-white/20 text-white' : `${tab.bgColor} ${tab.color} group-hover:scale-110 duration-300`}`}>
                     <tab.icon className={`w-5 h-5 drop-shadow-sm`} />
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-semibold truncate tracking-wide">{tab.name}</span>
                  )}
                  {activeTab === tab.id && !isSidebarCollapsed && <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-70" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`mx-3 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            theme === 'dark'
              ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 shrink-0" />
          ) : (
            <Moon className="w-5 h-5 shrink-0" />
          )}
          {!isSidebarCollapsed && (
            <span className="text-sm font-medium">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className={`${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'} rounded-xl p-3 mb-3 flex items-center gap-3`}>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>
                  {profile?.full_name || 'Admin'}
                </p>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className={`text-[10px] ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} font-bold flex items-center gap-1`}
                >
                  <LayoutDashboard className="w-3 h-3" /> Dashboard
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-1 text-sm font-bold text-gray-500 hover:text-white hover:bg-gray-500/50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" /> 
            {!isSidebarCollapsed && 'Sign Out'}
          </button>
          
          <button
            onClick={() => setShowClearDataModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 text-[11px] font-bold text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition uppercase tracking-widest border border-red-500/20"
          >
            <Trash2 className="w-4 h-4" /> 
            {!isSidebarCollapsed && 'Clear Test Data'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'}`}>
        <div className="max-w-6xl mx-auto p-4 sm:p-8 lg:p-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Breadcrumbs */}
            <Breadcrumbs 
              items={[
                { label: 'Admin Portal', onClick: () => handleTabClick('dashboard') },
                { label: [...mainTabs, ...managementTabs].find((tab) => tab.id === activeTab)?.name || activeTab }
              ]}
              onHome={() => handleTabClick('dashboard')}
            />

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Admin Dashboard
                    </h1>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Overview of system performance and analytics
                    </p>
                  </div>
                <div className="hidden md:flex gap-3">
                  <button
                    onClick={() => handleTabClick('links')}
                    className={`inline-flex items-center gap-2 rounded-xl bg-pink-500/10 px-4 py-2 text-sm font-bold text-pink-500 hover:bg-pink-500/20 transition`}
                  >
                    <SmartphoneNfc className="h-4 w-4" />
                    Manage WhatsApp Links
                  </button>
                </div>
                </div>
                
                <AdminDashboardCharts />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <TopStudentsWidget />
                  <div className="lg:col-span-2">
                    <ActivityLogs />
                  </div>
                </div>
              </div>
            )}

            {/* Other Tabs */}
            {activeTab === 'questions' && <QuestionHub />}
            {activeTab === 'exams' && <ExamCreator />}
            {activeTab === 'notifications' && <GlobalAnnouncement />}
            {activeTab === 'revenue' && <RevenueTracker />}
            {activeTab === 'premium' && <PremiumSettings />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'support' && <SupportInbox />}
            {activeTab === 'subscription' && <SubscriptionManagement />}
            {activeTab === 'leaderboard' && <AdminLeaderboard />}
            {activeTab === 'activity' && <ActivityLogs />}
            {activeTab === 'backup' && <DatabaseBackup />}
            {activeTab === 'links' && <ManageLinks />}
          </div>
        </div>
      </main>
      
      {/* Premium Clear Data Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md overflow-hidden rounded-[24px] border ${theme === 'dark' ? 'border-red-900/50 bg-slate-900' : 'border-red-200 bg-white'} shadow-2xl`}>
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-red-900/30 bg-red-900/10' : 'border-red-100 bg-red-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600'}`}>
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-xl font-black ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Clear Testing Data</h3>
                  <p className={`text-xs font-bold mt-1 uppercase tracking-wider ${theme === 'dark' ? 'text-red-400/70' : 'text-red-600/70'}`}>Irreversible Action</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className={`text-sm mb-4 leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                This will permanently delete testing data from the database. Only the following collections will be wiped:
              </p>
              
              <ul className={`text-sm font-bold mb-6 space-y-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                <li className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-500" /> Notifications</li>
                <li className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-500" /> Support Tickets</li>
                <li className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-500" /> Revenue & Transactions</li>
              </ul>

              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Lock className="w-3 h-3" /> Admin Security Password
                  </label>
                  <input
                    type="password"
                    value={clearDataPassword}
                    onChange={(e) => setClearDataPassword(e.target.value)}
                    placeholder="Enter security password..."
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-500 font-medium ${
                      theme === 'dark' 
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowClearDataModal(false);
                      setClearDataPassword('');
                    }}
                    className={`w-full px-5 py-3 rounded-xl font-bold transition flex-1 border ${
                      theme === 'dark'
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearData}
                    disabled={isClearingData || !clearDataPassword}
                    className="w-full px-5 py-3 rounded-xl font-bold transition shadow-lg shadow-red-500/20 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    {isClearingData ? 'Clearing...' : 'Confirm Wipe'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
