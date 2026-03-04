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
    return unsubscribe;
  }, [store]);

  return {
    user,
    setUser: (nextUser) => store.setUser(nextUser),
    clearUser: () => store.clearUser(),
  };
}

export default useAuthStore;
