import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Copy, Lock, Mail, User as UserIcon, X } from 'lucide-react';
import { authService, mapAuthError, type AuthErrorInfo } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [authTab, setAuthTab] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorInfo(null);
      setLoading(false);
      setCopiedHost(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorInfo(null);
    setLoading(true);
    try {
      const user = await authService.signInWithGoogle();
      const firstName = (user.displayName || user.email || 'there').split(' ')[0];
      onSuccess(`Signed in as ${firstName}!`);
      onClose();
    } catch (err) {
      setErrorInfo(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);

    if (emailMode === 'signup' && name.trim().length < 2) {
      setErrorInfo({ code: 'validation', message: 'Please enter your full name.' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorInfo({ code: 'validation', message: 'Enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      setErrorInfo({
        code: 'validation',
        message: 'Password must be at least 6 characters.',
      });
      return;
    }

    setLoading(true);
    try {
      if (emailMode === 'signup') {
        await authService.signUpWithEmail(name, email, password);
        onSuccess('Account created & signed in!');
      } else {
        await authService.signInWithEmail(email, password);
        onSuccess('Signed in to your account!');
      }
      onClose();
    } catch (err) {
      setErrorInfo(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHostname = async (hostname: string) => {
    try {
      await navigator.clipboard.writeText(hostname);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } catch {
      setCopiedHost(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2933]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-auth-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#E4E7EB] shadow-xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="customer-auth-title" className="text-xl font-bold text-[#1F2933]">
              Customer Sign In
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#52606D]">
              Sync your Dehradun profile &amp; track your rentals on any device.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="w-9 h-9 rounded-xl border border-[#E4E7EB] flex items-center justify-center text-[#52606D] hover:text-[#1F2933] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Method Segmented Switch */}
        <div
          role="tablist"
          aria-label="Sign-in methods"
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#FAF9F6] border border-[#E4E7EB] mb-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={authTab === 'google'}
            onClick={() => {
              setAuthTab('google');
              setErrorInfo(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
              authTab === 'google'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-transparent text-[#52606D] hover:text-[#1F2933]'
            }`}
          >
            Google (Gmail)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authTab === 'email'}
            onClick={() => {
              setAuthTab('email');
              setErrorInfo(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
              authTab === 'email'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-transparent text-[#52606D] hover:text-[#1F2933]'
            }`}
          >
            Email &amp; Password
          </button>
        </div>

        {/* Error & Domain Guidance Banner */}
        {errorInfo && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950 space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{errorInfo.message}</p>
            </div>

            {errorInfo.isDomainError && errorInfo.hostname && (
              <div className="pt-1 space-y-2 text-[11px] text-amber-900">
                <p>
                  To enable Google Sign-In on this domain, open{' '}
                  <span className="font-semibold">
                    Firebase Console → Authentication → Settings → Authorized domains
                  </span>{' '}
                  and add:
                </p>
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200">
                  <code className="font-mono text-[11px] font-semibold text-[#1F2933] truncate">
                    {errorInfo.hostname}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyHostname(errorInfo.hostname!)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B4332] shrink-0 cursor-pointer"
                  >
                    {copiedHost ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('email');
                    setErrorInfo(null);
                  }}
                  className="font-semibold text-[#1B4332] underline underline-offset-2 cursor-pointer"
                >
                  Or sign in with Email &amp; Password instead →
                </button>
              </div>
            )}

            {errorInfo.isPopupError && (
              <button
                type="button"
                onClick={() => {
                  setAuthTab('email');
                  setErrorInfo(null);
                }}
                className="font-semibold text-[#1B4332] underline underline-offset-2 cursor-pointer"
              >
                Switch to Email &amp; Password sign-in →
              </button>
            )}
          </div>
        )}

        {authTab === 'google' ? (
          <div className="space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-xl border border-[#E4E7EB] bg-white hover:bg-[#FAF9F6] hover:border-[#1B4332] disabled:opacity-60 text-sm font-semibold text-[#1F2933] flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <p className="text-xs text-[#52606D] text-center leading-relaxed">
              Pre-fills your checkout details and syncs bookings across your phone and laptop.
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {emailMode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-medium text-[#52606D] mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#52606D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Rawat"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#52606D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#52606D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1B4332] hover:bg-[#143325] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {loading
                ? 'Please wait...'
                : emailMode === 'signup'
                  ? 'Create Account'
                  : 'Sign In'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setEmailMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                  setErrorInfo(null);
                }}
                className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
              >
                {emailMode === 'signin'
                  ? 'New to Library of Things? Create an account'
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
