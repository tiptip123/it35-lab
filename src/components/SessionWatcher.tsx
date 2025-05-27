import { useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

interface SessionWatcherProps {
  email: string | null;
}

const SessionWatcher: React.FC<SessionWatcherProps> = ({ email }) => {
  useEffect(() => {
    if (!email) return;

    const checkForLock = async () => {
      const { data: lockedUser } = await supabase
        .from('locked_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (lockedUser) {
        await supabase.auth.signOut();
        localStorage.setItem('forceContactAdmin', 'true');
        localStorage.setItem(
          'logoutReason',
          'Your account has been locked because it was accessed from another device. Please contact the admin.'
        );
        window.location.href = '/it35-lab';
      }
    };

    const interval = setInterval(checkForLock, 3000);
    return () => clearInterval(interval);
  }, [email]);

  return null;
};

export default SessionWatcher; 