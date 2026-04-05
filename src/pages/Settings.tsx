import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { 
  ArrowLeft, 
  User, 
  Trophy, 
  HelpCircle, 
  Crown,
  ChevronRight,
  LogOut
} from 'lucide-react';

export default function Settings() {
  const { profile, signOut, isPremium } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const menuItems = [
    {
      icon: User,
      title: 'Profile',
      description: 'Manage your account details',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      action: () => navigate('/profile')
    },
    {
      icon: Trophy,
      title: 'Leaderboard',
      description: 'Check your ranking',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      action: () => navigate('/leaderboard')
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      description: 'Get help and contact support',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      action: () => navigate('/support')
    },
    {
      icon: Crown,
      title: isPremium ? 'Manage Premium' : 'Upgrade to Premium',
      description: isPremium 
        ? `Premium until ${profile?.premium_until ? formatDate(profile.premium_until) : 'N/A'}`
        : 'Unlock all features',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      action: () => navigate('/upgrade')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* User Info Card */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">
                {profile?.full_name || 'User'}
              </h2>
              <p className="text-sm text-gray-400">{profile?.email}</p>
              {isPremium && (
                <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500/20 to-purple-500/20 rounded-full border border-amber-500/30">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Premium Member</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-medium text-white group-hover:text-gray-100">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition" />
            </button>
          ))}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full mt-6 flex items-center justify-center gap-2 p-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 text-red-400 font-medium transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}