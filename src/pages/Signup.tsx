import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, Lock, User, Chrome, Eye, EyeOff, Phone } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

// Common country codes for Indian subcontinent and major countries
const countryCodes = [
  { code: '+91', label: 'India', flag: '🇮🇳' },
  { code: '+1', label: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', label: 'UK', flag: '🇬🇧' },
  { code: '+61', label: 'Australia', flag: '🇦🇺' },
  { code: '+971', label: 'UAE', flag: '🇦🇪' },
  { code: '+966', label: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+92', label: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', label: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', label: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', label: 'Nepal', flag: '🇳🇵' },
];

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  
  const { signUp, signInWithGoogle } = useAuth();
  const { navigate } = useRouter();
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const { needsEmailConfirmation } = await signUp(email, password, fullName);
      if (needsEmailConfirmation) {
        setInfo(
          'Account created! You need to verify your email. If you turned off confirmation in Supabase, try logging in now.'
        );
        // If they still need to verify, they stay on signup for a bit or can manually go to login
        setTimeout(() => navigate('/login'), 5000);
      } else {
        // Logged in immediately (email confirmation OFF)
        navigate('/dashboard');
      }
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

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setMobileNumber(value);
    }
  };

  const isFormValid = email && password.length >= 6 && fullName && mobileNumber.length === 10;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 py-12 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-green-50 via-white to-blue-50'
    }`}>
      <div className={`max-w-md w-full rounded-2xl shadow-2xl p-6 sm:p-8 border ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col items-center mb-6">
          <BrandLogo variant="hero" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg" />
          <p className={`text-center font-semibold tracking-wide mt-4 ${
            theme === 'dark' ? 'text-green-400' : 'text-green-600'
          }`}>
            Railway Study Point
          </p>
        </div>
        <h1 className={`text-2xl sm:text-3xl font-bold text-center mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Create Account
        </h1>
        <p className={`text-center mb-8 text-sm sm:text-base ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Start your railway exam preparation today
        </p>

        {info && (
          <div className="bg-blue-900/50 dark:bg-blue-900/50 bg-blue-100 border border-blue-500 dark:border-blue-500 border-blue-200 text-blue-100 dark:text-blue-800 px-4 py-3 rounded-lg mb-6 text-sm">
            {info}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 dark:bg-red-900/50 bg-red-100 border border-red-500 dark:border-red-500 border-red-200 text-red-200 dark:text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Full Name
            </label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm sm:text-base ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                placeholder="John Doe"
                required
              />
            </div>
          </div>

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
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm sm:text-base ${
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
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Mobile Number
            </label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 h-full ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  }`}
                >
                  <span className="text-xl">{selectedCountry.flag}</span>
                  <span className="text-sm">{selectedCountry.code}</span>
                </button>
                
                {showCountryDropdown && (
                  <div className={`absolute top-full left-0 mt-2 w-48 rounded-lg border shadow-lg z-50 max-h-60 overflow-y-auto ${
                    theme === 'dark' 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}>
                    {countryCodes.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowCountryDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-opacity-50 ${
                          selectedCountry.code === country.code
                            ? theme === 'dark' ? 'bg-green-600/20' : 'bg-green-50'
                            : theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xl">{country.flag}</span>
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {country.label} ({country.code})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative flex-1">
                <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={handleMobileNumberChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  }`}
                  placeholder="Enter 10-digit mobile number"
                  required
                />
              </div>
            </div>
            <p className={`mt-1 text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {mobileNumber.length}/10 digits
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-12 py-2.5 sm:py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm sm:text-base ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                placeholder="••••••••"
                required
                minLength={6}
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
            <p className={`mt-1 text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Must be at least 6 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`w-full font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
              theme === 'dark'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
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
              : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
          }`}
        >
          <Chrome className="w-5 h-5" />
          Sign in with Google
        </button>

        <p className={`mt-6 text-center text-sm ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
        }`}>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className={`${
              theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
            }`}
          >
            Forgot password?
          </button>
        </p>

        <p className={`mt-4 text-center text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className={`font-semibold transition ${
              theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'
            }`}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}