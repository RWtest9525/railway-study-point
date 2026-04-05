import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { 
  Trophy, 
  Home, 
  HelpCircle, 
  Crown, 
  Settings,
  Bell
} from 'lucide-react';

interface BottomNavProps {
  onNotificationClick?: () => void;
}

export function BottomNav({ onNotificationClick }: BottomNavProps) {
  const { navigate, currentPath } = useRouter();
  const { isPremium } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/';
    }
    return currentPath === path;
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 z-50 safe-area-pb">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {/* Leaderboard */}
            <button
              onClick={() => navigate('/leaderboard')}
              className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${
                isActive('/leaderboard') ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Trophy className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Leaderboard</span>
            </button>

            {/* Help */}
            <button
              onClick={() => navigate('/support')}
              className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${
                isActive('/support') ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <HelpCircle className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Help</span>
            </button>

            {/* Home */}
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${
                isActive('/dashboard') ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Home className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Home</span>
            </button>

            {/* Premium */}
            {isPremium ? (
              <div className="flex flex-col items-center justify-center w-full h-full py-2 text-yellow-400">
                <Crown className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">Premium</span>
              </div>
            ) : (
              <button
                onClick={() => navigate('/upgrade')}
                className="flex flex-col items-center justify-center w-full h-full py-2 text-gray-500 hover:text-yellow-400 transition"
              >
                <Crown className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">Premium</span>
              </button>
            )}

            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className={`flex flex-col items-center justify-center w-full h-full py-2 transition ${
                isActive('/settings') || isActive('/profile') || isActive('/membership') ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
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