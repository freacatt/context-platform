import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';

export const MIN_PASSWORD_LENGTH = 8;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      validatePasswordRequirements: (password: string) => {
        if (password.length < MIN_PASSWORD_LENGTH) {
          throw new ConvexError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }
      },
    }),
  ],
});
