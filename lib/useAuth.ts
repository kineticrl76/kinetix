'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  return {
    userId: session?.user?.id ?? null,
    user: session?.user ?? null,
    loading: status === 'loading',
    authenticated: status === 'authenticated',
  };
}
