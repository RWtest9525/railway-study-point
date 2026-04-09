import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import {
  Settings,
  User,
  Crown,
  Shield,
  Briefcase,
  LogOut,
  ChevronDown,
  Clock,
  Trophy,
  Star,
  Zap,
  ShieldCheck,
  Award
} from 'lucide-react';

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserPanel({ isOpen, onClose }: UserPanelProps) {
  const { profile, signOut, isPremium, effectiveRole, trialExpiredNeedsPremium } = useAuth();
  const { navigate } = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'membership' | 'stats'>('profile');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const daysLeftTrial = profile ? Math.ceil((new Date(profile.premium_until || '').getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]">
      <div 
        ref={panelRef}
        className="fixed top-16 right-4 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{profile?.full_name || 'User'}</h3>
                <p className="text-gray-400 text-sm">{profile?.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* Status Badges */}
          <div className="flex items-center gap-2 mt-3">
            {isPremium ? (
              <span className="inline-flex items-center gap-1.5 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold">
                <Crown className="w-3 h-3" />
                Premium Member
              </span>
            ) : trialExpiredNeedsPremium ? (
              <span className="inline-flex items-center gap-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-400 px-3 py-1 rounded-full text-xs font-bold">
                <ShieldCheck className="w-3 h-3" />
                Upgrade Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
                <Clock className="w-3 h-3" />
                Trial Active
              </span>
            )}
            {effectiveRole === 'admin' && (
              <span className="inline-flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 text-red-400 px-3 py-1 rounded-full text-xs font-bold">
                <Shield className="w-3 h-3" />
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'membership', label: 'Membership', icon: Crown },
            { id: 'stats', label: 'Stats', icon: Trophy }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Account Information</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="text-white">{profile?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="text-white">{profile?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="text-white capitalize">{effectiveRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Member Since:</span>
                    <span className="text-white">{new Date(profile?.created_at || '').toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/profile');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/support');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition"
                >
                  Support
                </button>
              </div>
            </div>
          )}

          {activeTab === 'membership' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  <div>
                    <h4 className="text-white font-medium">Membership Status</h4>
                    <p className="text-yellow-300 text-sm">
                      {isPremium ? 'Premium Member' : 'Free Trial'}
                    </p>
                  </div>
                </div>
                
                {!isPremium && (
                  <div className="text-sm text-gray-300 mb-3">
                    <p>Days remaining: <span className="text-yellow-300 font-medium">{daysLeftTrial}</span></p>
                    <p className="text-gray-400">Upgrade to unlock all features</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    onClose();
                    navigate('/upgrade');
                  }}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                    isPremium
                      ? 'bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30'
                      : 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white hover:from-yellow-700 hover:to-yellow-800'
                  }`}
                >
                  {isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
                </button>
              </div>

              {!isPremium && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Premium Benefits</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    {[
                      { icon: Star, text: 'Unlimited mock tests' },
                      { icon: Zap, text: 'Advanced analytics' },
                      { icon: Award, text: 'Detailed performance reports' },
                      { icon: ShieldCheck, text: 'Ad-free experience' }
                    ].map((benefit, index) => {
                      const Icon = benefit.icon;
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-yellow-400" />
                          <span>{benefit.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">12</div>
                  <div className="text-xs text-gray-400 mt-1">Exams Taken</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">85%</div>
                  <div className="text-xs text-gray-400 mt-1">Avg. Score</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">4.2</div>
                  <div className="text-xs text-gray-400 mt-1">Rating</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">150</div>
                  <div className="text-xs text-gray-400 mt-1">Questions Solved</div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Recent Activity</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>Mock Test - RRB NTPC</span>
                    <span className="text-green-400">85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Group D Practice</span>
                    <span className="text-green-400">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ALP Mock Test</span>
                    <span className="text-red-400">62%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex flex-col gap-2">
            {effectiveRole === 'admin' && (
              <button
                onClick={() => {
                  onClose();
                  navigate('/admin-portal');
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition"
              >
                <Shield className="w-4 h-4" />
                Admin Portal
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                navigate('/leaderboard');
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition"
            >
              <Trophy className="w-4 h-4" />
              Leaderboard
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}