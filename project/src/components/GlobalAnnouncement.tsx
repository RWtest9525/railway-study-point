import { useState } from 'react';
import { Megaphone, Send, X, Bell } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function GlobalAnnouncement() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        message: message.trim(),
        createdAt: serverTimestamp(),
        active: true,
      });
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      console.error('Error sending announcement:', e);
    }
    setSending(false);
  };

  return (
    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 shadow-lg border mb-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Global Announcement
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Send a notice to all users
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. New Mock Test Uploaded! 🎉"
          className={`flex-1 px-4 py-2.5 rounded-xl border text-sm ${
            isDark
              ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500'
              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
          } focus:outline-none focus:ring-2 focus:ring-orange-500`}
        />
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${
            sent
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50'
          }`}
        >
          {sent ? (
            <><Bell className="w-4 h-4" /> Sent!</>
          ) : sending ? (
            <><Send className="w-4 h-4 animate-pulse" /> Sending...</>
          ) : (
            <><Send className="w-4 h-4" /> Send</>
          )}
        </button>
      </div>

      {sent && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-500 font-medium">
          <Bell className="w-4 h-4" />
          Announcement sent to all users successfully!
        </div>
      )}
    </div>
  );
}
