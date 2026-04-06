import { useRouter } from '../contexts/RouterContext';
import { ArrowLeft, Bell, Zap } from 'lucide-react';

export function Notifications() {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="font-bold text-lg text-white">Notifications</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {/* Animated Bell Icon */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Bell className="w-12 h-12 text-white" />
            </div>
            {/* Notification badge */}
            <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full border-4 border-gray-950 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">!</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Coming Soon!
          </h2>

          {/* Description */}
          <p className="text-gray-400 text-lg mb-8">
            We're working hard to bring you an amazing notifications experience. 
            Stay tuned for updates!
          </p>

          {/* Feature Preview Cards */}
          <div className="space-y-4 text-left mb-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Instant Alerts</h3>
                <p className="text-gray-500 text-xs">Get notified about new tests instantly</p>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Smart Reminders</h3>
                <p className="text-gray-500 text-xs">Never miss an important update</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition active:scale-95"
          >
            Go to Home
          </button>
        </div>
      </main>
    </div>
  );
}