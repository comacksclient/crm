import NextAuth, { type DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            role: string;
        } & DefaultSession["user"]
    }
}

const prisma = new PrismaClient();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    pages: {
        signIn: '/login', // Custom login page
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (!user.email) return false;

            // Check if user exists in our DB
            let dbUser = await prisma.user.findUnique({
                where: { email: user.email }
            });

            // If not, auto-create them
            if (!dbUser) {
                // Determine if this person is the designated admin
                const isSystemAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                dbUser = await prisma.user.create({
                    data: {
                        email: user.email,
                        name: user.name || '',
                        image: user.image || '',
                        role: isSystemAdmin ? 'ADMIN' : 'SDR',
                    }
                });
            }

            return true;
        },
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                // Fetch the role from the DB to inject into the token
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email as string }
                });
                if (dbUser) {
                    token.role = dbUser.role;
                }
            }
            return token;
        },
        async session({ session, token }) {
            // Propagate the role from the token to the client session
            if (session.user && token.role) {
                session.user.role = token.role as string;
            }
            return session;
        }
    }
});
