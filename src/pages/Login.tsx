import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, Lock, Chrome, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signInWithGoogle } = useAuth();
  const { navigate } = useRouter();
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message === 'Email not confirmed') {
        setError('Please verify your email address before signing in. Check your inbox (and spam).');
      } else if (err.message === 'Invalid login credentials') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message || 'An error occurred during sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 py-12 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-blue-100 to-purple-100'
    }`}>
      <div className={`max-w-md w-full rounded-2xl shadow-2xl p-6 sm:p-8 border ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col items-center mb-6">
          <BrandLogo variant="hero" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg" />
          <p className={`text-center font-semibold tracking-wide mt-4 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`}>
            Railway Study Point
          </p>
        </div>
        <h1 className={`text-2xl sm:text-3xl font-bold text-center mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Welcome Back
        </h1>
        <p className={`text-center mb-8 text-sm sm:text-base ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Sign in to continue your preparation
        </p>

        {error && (
          <div className={`px-4 py-3 rounded-lg mb-6 text-sm ${
            theme === 'dark' 
              ? 'bg-red-900/50 border border-red-500 text-red-200' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm sm:text-base ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Password</label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className={`text-xs ${
                  theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-12 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm sm:text-base ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-2 ${
              theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
            }`}>Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className={`w-full font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base ${
            theme === 'dark'
              ? 'bg-white hover:bg-gray-100 text-gray-900'
              : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm hover:shadow-md'
          }`}
        >
          <Chrome className="w-5 h-5" />
          Sign in with Google
        </button>

        <p className={`mt-8 text-center text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className={`font-semibold transition ${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}