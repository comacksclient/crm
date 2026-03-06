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
                dbUser = await prisma.user.create({
                    data: {
                        email: user.email,
                        name: user.name || '',
                        image: user.image || '',
                        role: 'SDR' // Default generic fallback required by Prisma enum
                    }
                });
            }

            return true;
        },
        async jwt({ token, user }) {
            return token;
        },
        async session({ session, token }) {
            return session;
        }
    }
});
