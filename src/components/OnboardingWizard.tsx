import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Check, Sparkles, MapPin, Globe, Compass, Film, Award, Heart } from 'lucide-react';
import { User as UserType, Anime } from '../types';
import { countries, languages } from '../utils/geography';
import SearchableSelect from './SearchableSelect';
import { PREMIUM_AVATARS } from './AuthModal';

interface OnboardingWizardProps {
  user: UserType;
  animeList: Anime[];
  onComplete: (updatedUser: UserType) => void;
}

const GENRES_POOL = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
  'Horror', 'Mecha', 'Mystery', 'Romance', 'Sci-Fi', 
  'Slice of Life', 'Sports', 'Supernatural', 'Suspense'
];

export default function OnboardingWizard({ user, animeList, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState(user.username || '');
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [avatar, setAvatar] = useState(user.avatar || PREMIUM_AVATARS[0].id);
  const [bio, setBio] = useState(user.bio || '');
  
  const [country, setCountry] = useState(user.country || '');
  const [language, setLanguage] = useState(user.language || '');

  const [selectedGenres, setSelectedGenres] = useState<string[]>(user.favoriteGenres || []);
  const [favoriteAnime, setFavoriteAnime] = useState(user.favoriteAnime || '');
  const [favoriteStudio, setFavoriteStudio] = useState(user.favoriteStudio || '');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const countryOptions = countries.map(c => ({
    label: c.name,
    value: c.name,
    extra: c.flag
  }));

  const languageOptions = languages.map(l => ({
    label: l.name,
    value: l.name,
    extra: '🗣️'
  }));

  const animeOptions = animeList.map(a => ({
    label: a.english_title || a.title,
    value: a.english_title || a.title
  }));

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!username.trim() || username.trim().length < 3) {
        setError('Username is required and must be at least 3 characters.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!country) {
        setError('Please select your country to continue.');
        return;
      }
      if (!language) {
        setError('Please select your primary language to continue.');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError('');
    setStep(prev => Math.max(1, prev - 1));
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim() || undefined,
          avatar,
          bio: bio.trim(),
          country,
          language,
          favoriteGenres: selectedGenres,
          favoriteAnime: favoriteAnime.trim(),
          favoriteStudio: favoriteStudio.trim()
        })
      });

      if (res.ok) {
        const updated = await res.json();
        onComplete(updated);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update user profile onboarding data.');
      }
    } catch (err: any) {
      console.error('Onboarding update error:', err);
      setError('A connection error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col gap-6"
        id="onboarding-wizard-container"
      >
        {/* Wizard Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-display font-bold text-white leading-tight">Welcome to AniMatch</h2>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Profile Setup Wizard</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <span className={step === 1 ? 'text-indigo-400 font-bold' : ''}>01</span>
            <span>/</span>
            <span className={step === 2 ? 'text-indigo-400 font-bold' : ''}>02</span>
            <span>/</span>
            <span className={step === 3 ? 'text-indigo-400 font-bold' : ''}>03</span>
          </div>
        </div>

        {/* Wizard Error Block */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Steps Content */}
        <div className="flex-1 min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-sm font-bold text-zinc-150">Step 1: Set Your Identity</h3>
                  <p className="text-xs text-zinc-500 mt-1">Select an avatar and customize how you appear to others in the matchmaking community.</p>
                </div>

                {/* Avatar Grid */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block text-center">Select Profile Avatar</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PREMIUM_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setAvatar(av.id)}
                        className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                          avatar === av.id
                            ? 'bg-zinc-850 border-indigo-500 text-white shadow-md'
                            : 'bg-zinc-950/40 border-zinc-850 text-zinc-500 hover:border-zinc-700'
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

                {/* Username & Display Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Username <span className="text-indigo-400 font-bold">*</span></label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                        placeholder="e.g. SpikeSpiegel"
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Display Name <span className="text-zinc-600">(Optional)</span></label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Spike Spiegel"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                </div>

                {/* Bio Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Short Bio <span className="text-zinc-600">(Optional)</span></label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={140}
                    placeholder="Tell other fans a bit about yourself, favorite eras, or watch styles..."
                    className="w-full h-20 rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                  />
                  <div className="flex justify-end">
                    <span className="text-[9px] font-mono text-zinc-600">{bio.length}/140</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-sm font-bold text-zinc-150">Step 2: Region & Language</h3>
                  <p className="text-xs text-zinc-500 mt-1">Select your country and primary language to align watch hours, connection compatibility, and region preference.</p>
                </div>

                {/* Country Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-indigo-400" />
                    Select Your Country <span className="text-indigo-400 font-bold">*</span>
                  </label>
                  <SearchableSelect
                    options={countryOptions}
                    value={country}
                    onChange={(val) => setCountry(val)}
                    placeholder="Search countries..."
                    searchPlaceholder="Type a country name..."
                  />
                </div>

                {/* Language Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Globe className="h-3 w-3 text-indigo-400" />
                    Primary Language <span className="text-indigo-400 font-bold">*</span>
                  </label>
                  <SearchableSelect
                    options={languageOptions}
                    value={language}
                    onChange={(val) => setLanguage(val)}
                    placeholder="Search languages..."
                    searchPlaceholder="Type a language..."
                  />
                </div>

                <div className="bg-zinc-950/40 border border-zinc-850/80 rounded-2xl p-4 flex gap-3 text-xs text-zinc-400 leading-relaxed">
                  <Compass className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p>
                    AniMatch connects fans globally while keeping localized communication smooth. Setting these ensures high compatibility matchmaking models.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-sm font-bold text-zinc-150">Step 3: Favorite Genres</h3>
                  <p className="text-xs text-zinc-500 mt-1">Choose your favorite genres, specific shows, and preferred studios to personalize your experience.</p>
                </div>

                {/* Genres Bias */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1 justify-center">
                    <Heart className="h-3 w-3 text-indigo-400" />
                    Select Favorite Genres ({selectedGenres.length} selected)
                  </label>
                  <div className="flex flex-wrap justify-center gap-1.5 p-3 bg-zinc-950/40 rounded-xl border border-zinc-850 max-h-32 overflow-y-auto">
                    {GENRES_POOL.map((genre) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
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

                {/* Favorite Anime Searchable */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Film className="h-3 w-3 text-indigo-400" />
                    All-Time Favorite Anime <span className="text-zinc-600">(Optional)</span>
                  </label>
                  <SearchableSelect
                    options={animeOptions}
                    value={favoriteAnime}
                    onChange={(val) => setFavoriteAnime(val)}
                    placeholder="Search and select an anime show..."
                    searchPlaceholder="Search our catalog..."
                  />
                </div>

                {/* Favorite Studio */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Award className="h-3 w-3 text-indigo-400" />
                    Favorite Animation Studio <span className="text-zinc-600">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={favoriteStudio}
                    onChange={(e) => setFavoriteStudio(e.target.value)}
                    placeholder="e.g. Kyoto Animation, Madhouse, ufotable..."
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500/40 py-2.5 px-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-850 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200 text-xs px-5 py-2.5 font-bold transition-all cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs px-6 py-2.5 font-bold transition-all cursor-pointer shadow-lg"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-6 py-2.5 font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-950/20"
            >
              {isSubmitting ? (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-450 border-t-white animate-spin" />
              ) : (
                <>
                  Complete Setup
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
