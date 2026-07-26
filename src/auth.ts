import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findOrCreateGoogleUser } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    appUserId?: string;
  }
  interface User {
    appUserId?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    appUserId?: string;
  }
}

// NextAuth is used ONLY to perform the Google OAuth handshake — its own JWT session
// is disposable. The `signIn` callback finds-or-creates the row in our existing
// `users` table and stashes its id; the `/google-bridge` page reads that id via
// `auth()` once, then issues our real `sd_session` cookie (createSessionForUser)
// and redirects on. Every other page in the app keeps using getSessionUser()
// unchanged, regardless of how the user signed in.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email || !account.providerAccountId) return false;
      const { user: appUser } = await findOrCreateGoogleUser({
        googleId: account.providerAccountId,
        email: user.email,
        displayName: user.name ?? undefined,
        avatarUrl: user.image ?? undefined,
      });
      user.appUserId = appUser.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.appUserId) token.appUserId = user.appUserId;
      return token;
    },
    async session({ session, token }) {
      if (token.appUserId) session.appUserId = token.appUserId;
      return session;
    },
  },
});
