import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Trophy, 
  Home, 
  HelpCircle, 
  Crown, 
  Settings
} from 'lucide-react';

export function BottomNav() {
  const { navigate, currentPath } = useRouter();
  const { isPremium } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/';
    }
    return currentPath === path;
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 safe-area-pb backdrop-blur-md border-t ${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {/* Leaderboard */}
            <button
              onClick={() => navigate('/leaderboard')}
              className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${
                isActive('/leaderboard') 
                  ? (isDark ? 'text-amber-400' : 'text-amber-600') 
                  : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')
              }`}
            >
              <Trophy className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Leaderboard</span>
            </button>

            {/* Help */}
            <button
              onClick={() => navigate('/support')}
              className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${
                isActive('/support') 
                  ? (isDark ? 'text-green-400' : 'text-green-600') 
                  : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')
              }`}
            >
              <HelpCircle className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Help</span>
            </button>

            {/* Home */}
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${
                isActive('/dashboard') 
                  ? (isDark ? 'text-blue-400' : 'text-blue-600') 
                  : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')
              }`}
            >
              <Home className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Home</span>
            </button>

            {/* Premium */}
            {isPremium ? (
              <button
                onClick={() => navigate('/membership')}
                className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'}`}
              >
                <Crown className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">Premium</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/upgrade')}
                className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${isDark ? 'text-gray-500 hover:text-yellow-400' : 'text-gray-400 hover:text-yellow-600'}`}
              >
                <Crown className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">Premium</span>
              </button>
            )}

            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${
                isActive('/settings') 
                  ? (isDark ? 'text-purple-400' : 'text-purple-600') 
                  : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')
              }`}
            >
              <Settings className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-16" />
    </>
  );
}
