import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 2 * 24 * 60 * 60, // 2 days
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // @ts-expect-error - NextAuth types don't include id field
        session.user.id = token.sub;
      }
      return session;
    },
  },
})

export { handler as GET, handler as POST }