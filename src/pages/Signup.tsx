import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { Mail, Lock, User, Chrome } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const { navigate } = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const { needsEmailConfirmation } = await signUp(email, password, fullName);
      if (needsEmailConfirmation) {
        setInfo(
          'We sent a confirmation link to your email. Open it to finish signing up, then return here to sign in.'
        );
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to create account. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700">
        <div className="flex flex-col items-center mb-6">
          <BrandLogo variant="hero" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg" />
          <p className="text-center text-green-400 font-semibold tracking-wide mt-4">
            Railway Study Point
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
          Create Account
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm sm:text-base">
          Start your railway exam preparation today
        </p>

        {info && (
          <div className="bg-blue-900/50 border border-blue-500 text-blue-100 px-4 py-3 rounded-lg mb-6 text-sm">
            {info}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2.5 sm:py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm sm:text-base"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2.5 sm:py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm sm:text-base"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2.5 sm:py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm sm:text-base"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Chrome className="w-5 h-5" />
          Sign in with Google
        </button>

        <p className="mt-6 text-center text-gray-500 text-sm">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-gray-400 hover:text-gray-300"
          >
            Forgot password?
          </button>
        </p>

        <p className="mt-4 text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-green-400 hover:text-green-300 font-semibold transition"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
