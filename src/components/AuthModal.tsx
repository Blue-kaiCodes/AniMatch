import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Check, X, ShieldAlert, ArrowRight, Heart } from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from '../utils/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    favoriteGenres: string[];
    recentlyViewedIds: number[];
    joinedAt: string;
  }) => void;
}

export const PREMIUM_AVATARS = [
  { id: 'naruto', name: 'Shinobi', color: 'from-orange-500 to-amber-600', emoji: '🥷' },
  { id: 'cyber', name: 'Cyberpunk', color: 'from-fuchsia-500 to-pink-600', emoji: '🦾' },
  { id: 'mecha', name: 'Pilot', color: 'from-blue-500 to-cyan-600', emoji: '🤖' },
  { id: 'sorcerer', name: 'Sorcerer', color: 'from-violet-600 to-indigo-700', emoji: '🔮' },
  { id: 'otaku', name: 'Chibi', color: 'from-emerald-500 to-teal-600', emoji: '🍙' },
  { id: 'samurai', name: 'Ronin', color: 'from-red-500 to-rose-600', emoji: '⚔️' }
];

const GENRES_POOL = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
  'Horror', 'Mecha', 'Mystery', 'Romance', 'Sci-Fi', 
  'Slice of Life', 'Sports', 'Supernatural', 'Suspense'
];

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'onboarding'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(PREMIUM_AVATARS[0].id);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'otaku',
          email: user.email,
          avatar: 'cyber',
          favoriteGenres: [],
          bio: 'Otaku explorer'
        })
      });

      if (res.ok) {
        const syncedUser = await res.json();
        onAuthSuccess(syncedUser);
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to sync with social backend.');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Google sign-in popup was blocked. Please allow popups for this page or click "Open in new tab" at the top right to log in.');
      } else {
        setError(err.message || 'Google authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (mode === 'signin') {
      if (!email || !password) {
        setError('Please fill in all fields.');
        return;
      }
      setIsLoading(true);
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: fbUser.uid,
            email: fbUser.email,
            username: fbUser.displayName || email.split('@')[0],
            avatar: 'cyber'
          })
        });

        if (res.ok) {
          const syncedUser = await res.json();
          onAuthSuccess(syncedUser);
          onClose();
        } else {
          const data = await res.json();
          setError(data.error || 'Social backend profile sync failed.');
        }
      } catch (err: any) {
        console.warn('Firebase client sign in failed, attempting server fallback:', err);
        try {
          const fallbackRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          if (fallbackRes.ok) {
            const syncedUser = await fallbackRes.json();
            onAuthSuccess(syncedUser);
            onClose();
          } else {
            const data = await fallbackRes.json();
            setError(data.error || 'Invalid email or password.');
          }
        } catch (fallbackErr: any) {
          console.error('Server fallback sign in failed:', fallbackErr);
          setError('Invalid email or password.');
        }
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'signup') {
      if (!email || !username || !password) {
        setError('Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      setMode('onboarding');
    }
  };

  const handleFinishSignup = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fbUser.uid,
          username,
          email,
          avatar,
          favoriteGenres: selectedGenres,
          bio: 'Proud member of AniMatch'
        })
      });

      if (res.ok) {
        const newUser = await res.json();
        onAuthSuccess(newUser);
        
        setEmail('');
        setUsername('');
        setPassword('');
        setSelectedGenres([]);
        setMode('signin');
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to complete registration synchronization.');
        setMode('signup');
      }
    } catch (err: any) {
      console.warn('Firebase client sign up failed, attempting server fallback:', err);
      try {
        const fallbackRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            email,
            password,
            avatar,
            favoriteGenres: selectedGenres,
            bio: 'Proud member of AniMatch'
          })
        });
        if (fallbackRes.ok) {
          const newUser = await fallbackRes.json();
          onAuthSuccess(newUser);
          
          setEmail('');
          setUsername('');
          setPassword('');
          setSelectedGenres([]);
          setMode('signin');
          onClose();
        } else {
          const data = await fallbackRes.json();
          setError(data.error || 'Failed to complete registration.');
          setMode('signup');
        }
      } catch (fallbackErr: any) {
        console.error('Server fallback sign up failed:', fallbackErr);
        setError(err.message || 'Failed to create user account.');
        setMode('signup');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="auth-modal-root">
        
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 md:p-8 flex flex-col gap-6 animate-fade-in"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Form and info */}
          {mode !== 'onboarding' ? (
            <div className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Heart className="h-6 w-6 fill-current" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white tracking-tight mt-3">
                    {mode === 'signin' ? 'Welcome back to AniMatch' : 'Create your account'}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {mode === 'signin' 
                      ? 'Access your personal watch boards and connect with friends' 
                      : 'Join a community of anime fans'}
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 animate-pulse">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{error}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{successMessage}</p>
                  </div>
                )}

                <div className="space-y-3.5">
                  {mode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Username</label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. SpikeSpiegel"
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. hunter@animatch.com"
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Password</label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[10px] text-zinc-500 hover:text-indigo-400 cursor-pointer hover:underline transition-all"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs py-3 cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg"
                >
                  {isLoading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-zinc-950 animate-spin" />
                  ) : mode === 'signin' ? (
                    'Sign In with Email'
                  ) : (
                    <>
                      Continue to Profile Setup
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Social Login Section */}
              <div className="space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800"></div>
                  </div>
                  <span className="relative bg-zinc-900 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Or Connect via Social
                  </span>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-300 font-bold text-xs py-2.5 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.15 15.435 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.983 0-.74-.08-1.302-.175-1.852l-10.618-.36z"/>
                  </svg>
                  Sign In with Google
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccessMessage('');
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                  }}
                  className="text-xs text-zinc-400 hover:text-indigo-400 underline decoration-zinc-800 hover:decoration-indigo-500 transition-colors cursor-pointer"
                >
                  {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-display font-bold text-white tracking-tight">
                  Customize Your Identity
                </h3>
                <p className="text-xs text-zinc-500">
                  Select an avatar and your favorite genres to customize your profile
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}

              {/* Avatar Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block text-center">
                  Select Avatar Character
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PREMIUM_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => setAvatar(av.id)}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                        avatar === av.id
                          ? 'bg-zinc-850 border-indigo-500 text-white shadow-md'
                          : 'bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${av.color} flex items-center justify-center text-sm shadow`}>
                        {av.emoji}
                      </div>
                      <span className="text-[8px] font-bold mt-1 text-zinc-400 truncate w-full text-center">{av.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Calibrator */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block text-center">
                  Favorite Genres ({selectedGenres.length} selected)
                </label>
                <div className="flex flex-wrap justify-center gap-1.5 max-h-40 overflow-y-auto p-1 bg-zinc-950/30 rounded-xl border border-zinc-850/60">
                  {GENRES_POOL.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleFinishSignup}
                disabled={isLoading}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/10"
              >
                {isLoading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-zinc-250 border-t-white animate-spin" />
                ) : (
                  <>
                    Complete Registration
                    <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function AvatarDisplay({ id, className = "h-8 w-8" }: { id: string; className?: string }) {
  const av = PREMIUM_AVATARS.find(a => a.id === id) || PREMIUM_AVATARS[0];
  return (
    <div className={`rounded-full bg-gradient-to-tr ${av.color} flex items-center justify-center text-white font-bold shadow shrink-0 ${className}`}>
      {av.emoji}
    </div>
  );
}
