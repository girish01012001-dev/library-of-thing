import { useEffect, useState, type FormEvent } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

const DEMO_PASSCODE = 'admin123';

export function AdminLoginModal({
  isOpen,
  onClose,
  onAuthenticated,
}: AdminLoginModalProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setError('');
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === DEMO_PASSCODE) {
      onAuthenticated();
    } else {
      setError('Incorrect staff passcode. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2933]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#E4E7EB] shadow-xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D8F3DC]/70 text-[#1B4332] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="admin-login-title" className="text-lg font-bold text-[#1F2933]">
                Store Staff Login
              </h2>
              <p className="text-xs text-[#52606D]">
                Private Dehradun Store Console
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close staff login dialog"
            className="w-9 h-9 rounded-xl border border-[#E4E7EB] flex items-center justify-center text-[#52606D] hover:text-[#1F2933] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-passcode"
              className="block text-xs font-medium text-[#52606D] mb-1.5"
            >
              Staff Passcode
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#52606D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-passcode"
                type="password"
                autoFocus
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter staff passcode"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
            )}
          </div>

          <p className="text-xs text-[#52606D] bg-[#FAF9F6] border border-[#E4E7EB] rounded-xl px-3.5 py-2.5">
            Demo Admin Passcode: <span className="font-mono font-semibold text-[#1B4332]">admin123</span>
          </p>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Open Admin Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
