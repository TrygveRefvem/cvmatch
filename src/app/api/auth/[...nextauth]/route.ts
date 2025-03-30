import NextAuth, { AuthOptions, User } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import GoogleProvider from 'next-auth/providers/google'
import GithubProvider from 'next-auth/providers/github'

// Initialize Prisma Client
const prisma = new PrismaClient()

// Explicitly type authOptions with AuthOptions
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Add Google/GitHub if configured
    // GoogleProvider({ ... }),
    // GithubProvider({ ... }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text", placeholder: "din@epost.no" },
        password: { label: "Passord", type: "password" }
      },
      async authorize(credentials): Promise<User | null> {
        // Check if email and password were provided
        if (!credentials?.email || !credentials?.password) {
          console.log('Authorize failed: Missing credentials');
          return null;
        }

        // Find user by email
        const userFromDb = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // If user not found or password not set, deny
        if (!userFromDb || !userFromDb.hashedPassword) {
          console.log(`Authorize failed: User not found or no password for ${credentials.email}`);
          // Important: If user doesn't exist after db reset, authorize fails here
          return null; 
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          userFromDb.hashedPassword
        );

        if (!isValidPassword) {
          console.log(`Authorize failed: Invalid password for ${credentials.email}`);
          return null;
        }

        console.log(`User authorized successfully: ${userFromDb.email}`);
        
        // Return the user object directly from the database finding
        // This ensures the structure matches what's needed for the JWT callback
        // And implicitly confirms the user exists in the DB at this point.
        return {
            id: userFromDb.id,
            email: userFromDb.email,
            name: userFromDb.name,
            image: userFromDb.image,
            role: userFromDb.role, // Access role directly
        };
      }
    })
    // Add other providers like Google, GitHub etc. here later if needed
  ],
  session: {
    strategy: "jwt", // Using JWT for session strategy
  },
  callbacks: {
    async jwt({ token, user }) { // Simplified params if account/profile not needed
      // Persist the user id and role to the token right after signin
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'CANDIDATE'; // Add user role to the token
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like id and role.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string; // Add role to session user object
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin', // Specify custom sign-in page path (we'll create this)
    // error: '/auth/error', // Optional: custom error page
    // Add other custom pages if needed (signOut, verifyRequest, etc.)
  },
  secret: process.env.NEXTAUTH_SECRET, // Essential for production!
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 