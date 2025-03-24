import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  profileImage?: string | null;
}

// Make the exported type match what's actually returned by the hook
export interface UserProfile {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

export function useUserProfile() {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile>({
    user: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (status === 'loading') {
      setUserProfile({
        user: null,
        isLoading: true,
        error: null
      });
      return;
    }

    if (status === 'unauthenticated') {
      setUserProfile({
        user: null,
        isLoading: false,
        error: null
      });
      return;
    }

    if (session?.user) {
      // You can fetch additional user profile data from an API here if needed
      setUserProfile({
        user: {
          ...session.user,
          // Default profile image if not available
          profileImage: session.user.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(session.user.name || 'User')
        },
        isLoading: false,
        error: null
      });
    }
  }, [session, status]);

  return userProfile;
} 