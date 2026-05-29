import type { NextAuthConfig } from 'next-auth';

// Edge-compatible config — no Prisma imports allowed here
export const authConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith('/auth');
      const isApiAuth = nextUrl.pathname.startsWith('/api/auth');
      if (isAuthPage || isApiAuth) return true;
      return isLoggedIn;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
} satisfies NextAuthConfig;
