import { ArrowLeft, BellRing } from 'lucide-react';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';

export function PushNotificationsInfo() {
  const { goBack } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-[#f5f7fb]'}`}>
      <header className={`${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-slate-200'} sticky top-0 z-50 border-b backdrop-blur-md`}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <button onClick={() => goBack()} className={`rounded-full p-2 ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <ArrowLeft className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
          </button>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Push Notification</h1>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Coming soon</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-slate-200 bg-white'} rounded-[32px] border p-6 shadow-sm`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
            <BellRing className="h-8 w-8" />
          </div>
          <h2 className={`mt-5 text-center text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            This feature is coming soon
          </h2>
          <p className={`mx-auto mt-3 max-w-xl text-center text-sm leading-7 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
            When this feature is ready, notifications will come outside the website too, so you can know instantly
            about new updates even when the app is not open.
          </p>
        </div>
      </main>
    </div>
  );
}
