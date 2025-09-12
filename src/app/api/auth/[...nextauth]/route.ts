import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account", // This will always show account picker
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 2 * 24 * 60 * 60, // 2 days in seconds
  },
  jwt: {
    maxAge: 2 * 24 * 60 * 60, // 2 days in seconds
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("SignIn callback:", { user, account, profile });
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error - NextAuth types don't include id field
        session.user.id = token.sub!;
      }
      // Add expiration info to session
      session.expires = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days from now
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.uid = user.id;
      }
      // Set token expiration
      const now = Date.now();
      const twoDays = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
      token.exp = Math.floor((now + twoDays) / 1000); // JWT exp is in seconds
      return token;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log("SignIn event:", { user, account, profile, isNewUser });
    },
    async signOut({ session, token }) {
      console.log("SignOut event:", { session, token });
    },
  },
})

export { handler as GET, handler as POST }