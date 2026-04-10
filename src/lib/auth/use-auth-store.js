'use client';

import { useEffect, useState } from 'react';
import { getAuthStore } from '@/lib/auth/auth-store';

export function useAuthStore() {
  const store = getAuthStore();
  const [user, setUser] = useState(() => store.getUser());

  useEffect(() => {
    const unsubscribe = store.subscribe((nextUser) => {
      setUser(nextUser);
    });
    // Validate localStorage matches server session on first mount
    store.validateSession();
    return unsubscribe;
  }, [store]);

  return {
    user,
    setUser: (nextUser) => store.setUser(nextUser),
    clearUser: () => store.clearUser(),
    hasPermission: (key) => store.hasPermission(key),
  };
}

export default useAuthStore;
