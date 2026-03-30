import Discord from '@auth/core/providers/discord';
import Google from '@auth/core/providers/google';
import { convexAuth } from '@convex-dev/auth/server';

const gemini = 'https://www.googleapis.com/auth/generative-language.retriever';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: `openid profile ${gemini}`,
        },
      },
    }),
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
      authorization: {
        url: 'https://discord.com/api/oauth2/authorize',
        params: { scope: 'identify' },
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const siteUrl = process.env.SITE_URL;
      if (!siteUrl) {
        return redirectTo.startsWith('/') ? redirectTo : '/';
      }

      if (redirectTo.startsWith('/')) {
        return new URL(redirectTo, siteUrl).toString();
      }

      if (redirectTo.startsWith(siteUrl)) {
        return redirectTo;
      }

      return siteUrl;
    },
  },
});
