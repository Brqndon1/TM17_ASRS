'use client';

import { useEffect, useState } from 'react';
import { getAuthStore } from '@/lib/auth/auth-store';

export function useAuthStore() {
  const store = getAuthStore();
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage on client mount only
    setUser(store.getUser());
    setHydrated(true);
    const unsubscribe = store.subscribe((nextUser) => {
      setUser(nextUser);
    });
    // Validate localStorage matches server session on first mount
    store.validateSession();
    return unsubscribe;
  }, [store]);

  return {
    user,
    hydrated,
    setUser: (nextUser) => store.setUser(nextUser),
    clearUser: () => store.clearUser(),
    hasPermission: (key) => store.hasPermission(key),
  };
}

export default useAuthStore;
