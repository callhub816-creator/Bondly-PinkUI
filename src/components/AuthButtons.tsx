import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../../components/NotificationProvider';

const AuthButtons: React.FC = () => {
  const { signInWithProvider } = useAuth();
  const { showNotification } = useNotification();

  const handleFacebook = async () => {
    try {
      await signInWithProvider('facebook');
    } catch (err) {
      console.error('Facebook sign-in error', err);
      showNotification('Unable to start Facebook OAuth flow.', 'error');
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithProvider('google');
    } catch (err) {
      console.error('Google sign-in error', err);
      showNotification('Unable to start Google OAuth flow.', 'error');
    }
  };

  return (
    <div className="flex gap-3">
      <button
        className="px-4 py-2 rounded-md bg-white border shadow-sm text-sm flex items-center gap-2"
        onClick={handleGoogle}
        aria-label="Sign in with Google"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.805 10.023h-9.78v3.954h5.606c-.242 1.53-1.324 3.57-4.22 4.02-2.65.418-6.047-.66-8.02-3.584C2.55 12.754 2.05 8.678 3.705 6.09 5.36 3.502 8.54 2.09 11.98 2.09c2.98 0 4.98 1.01 6.17 1.864l-2.646 2.724C14.88 6.36 13.6 5.6 11.98 5.6c-2.44 0-4.42 1.52-5.29 3.6-.86 2.07-.57 4.67.68 6.31 1.26 1.64 3.34 2.54 5.74 2.25 2.86-.35 3.9-1.92 4.01-3.02h-4.01v-3.52h9.05c.09.52.14 1.06.14 1.6 0 5.14-3.7 8.8-9 9.6-4.1.66-8.22-.72-10.5-4.04-2.33-3.35-2.5-7.8-.48-11.27C5.98 1.75 8.88.25 11.98.25c3.32 0 6.37 1.42 8.3 3.74 1.95 2.33 2.14 5.57 1.53 8.03z" fill="#EA4335" />
        </svg>
        <span>Sign in with Google</span>
      </button>

      <button
        className="px-4 py-2 rounded-md bg-white border shadow-sm text-sm"
        onClick={handleFacebook}
        aria-label="Sign in with Facebook"
      >
        Sign in with Facebook
      </button>
    </div>
  );
};

export default AuthButtons;
