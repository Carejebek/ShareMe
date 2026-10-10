import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // Shown on the login page; only revealed once the password is correct.
        if (user.suspendedAt) throw new Error('AccountSuspended');

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        return token;
      }

      // Re-read the account on every request so role changes and suspensions apply
      // straight away instead of when the 30-day login cookie expires.
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, suspendedAt: true }
        });
        token.role = current?.role;
        token.blocked = !current || current.suspendedAt !== null;
      }
      return token;
    },
    async session({ session, token }) {
      // Suspended or deleted accounts get a session with no user, i.e. they're treated as logged out.
      if (token.blocked) {
        return { expires: session.expires } as typeof session;
      }
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
