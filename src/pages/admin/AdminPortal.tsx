import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { FileText, PlusCircle, DollarSign, LogOut, Settings, UserPlus } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { QuestionBank } from './QuestionBank';
import { ExamCreator } from './ExamCreator';
import { RevenueTracker } from './RevenueTracker';
import { PremiumSettings } from './PremiumSettings';
import { UserPromotion } from './UserPromotion';

export function AdminPortal() {
  const { profile, signOut } = useAuth();
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<
    'questions' | 'exams' | 'revenue' | 'premium' | 'admins'
  >('questions');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const tabs = [
    { id: 'questions' as const, name: 'Question Bank', icon: FileText },
    { id: 'exams' as const, name: 'Exam Creator', icon: PlusCircle },
    { id: 'revenue' as const, name: 'Revenue', icon: DollarSign },
    { id: 'premium' as const, name: 'Premium', icon: Settings },
    { id: 'admins' as const, name: 'Admins', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo variant="nav" className="bg-white/5 ring-2 ring-white/15 shadow-md" />
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-bold text-white leading-tight truncate">
                  Railway Study Point
                </span>
                <span className="text-xs text-gray-400">Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Student dashboard
              </button>
              <span className="text-gray-300">
                {profile?.full_name || 'Admin'}
              </span>
              <button
                onClick={handleSignOut}
                className="text-gray-300 hover:text-white transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-semibold transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === 'questions' && <QuestionBank />}
          {activeTab === 'exams' && <ExamCreator />}
          {activeTab === 'revenue' && <RevenueTracker />}
          {activeTab === 'premium' && <PremiumSettings />}
          {activeTab === 'admins' && <UserPromotion />}
        </div>
      </div>
    </div>
  );
}
