import NextAuth, { AuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

// Initialize Prisma Client
const prisma = new PrismaClient()

// Explicitly type authOptions with AuthOptions
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Check if email and password were provided
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          throw new Error('Vennligst oppgi e-post og passord');
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // If user not found or password not set, deny
        if (!user || !user.hashedPassword) {
          console.log('User not found or no password set for:', credentials.email);
          throw new Error('Ugyldig e-post eller passord');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isValidPassword) {
          console.log('Invalid password for:', credentials.email);
          throw new Error('Ugyldig e-post eller passord');
        }

        console.log('Credentials authorized for:', user.email);
        // Return user object if authentication successful
        // Note: Only return necessary fields, not the password!
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          // Add any other fields you want accessible in the token/session
        };
      }
    })
    // Add other providers like Google, GitHub etc. here later if needed
  ],
  session: {
    strategy: "jwt", // Using JWT for session strategy
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist the user ID and email from the user object (returned by authorize) to the JWT
      if (user) {
        token.id = user.id;
        token.email = user.email; // Ensure email is added if available
        // You can add other user properties here if needed
        // token.role = user.role; 
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like user's id and email.
      // Make sure the session.user type is updated accordingly if you add more properties.
      if (token && session.user) {
        session.user.id = token.id as string; // Add ID from token to session
        session.user.email = token.email as string; // Add email from token to session
        // You can add other properties from the token here
        // session.user.role = token.role;
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