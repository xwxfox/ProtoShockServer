'use server';

import { cookies } from 'next/headers';
import { ProtoDBClass, users } from '@protoshock/database'; // adjust import to your db util
import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';
import '../lib/envConfig'
const SESSION_SECRET = process.env.SESSION_SECRET!;

export async function loginAdmin(formData: FormData): Promise<{ success: boolean | null; error?: string }> {
    const db = new ProtoDBClass();
    await db.init(); // Ensure the database is initialized
    if (!db.database) {
        return { success: false, error: 'Database not initialized.' };
    }

    const password = formData.get('password') as string;
    const admins = await db.database.select().from(users).where(eq(users.username, 'admin'));
    const admin = admins[0];

    if (!admin) return { success: false, error: 'No admin user set.' };

    const hashedPass = await createHash('sha256').update(`${password}`).digest('hex')
    const valid = hashedPass == admin.hashedPassword
    console.log(`Admin login attempt with password: ${password} - hashed: ${hashedPass}, valid: ${valid}`, admin.hashedPassword);
    if (!valid) return { success: false, error: 'Invalid password.' };

    // Create JWT session
    const session = await new SignJWT({ admin: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(SESSION_SECRET));

    (await cookies()).set('admin_session', session, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true };
}

export async function isLoggedIn(): Promise<{ success: boolean | null; error?: string }> {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');
    if (!session) return { success: false, error: 'No session found' };

    try {
        const { payload } = await jwtVerify(
            session.value,
            new TextEncoder().encode(SESSION_SECRET)
        );
        return { success: payload.admin === true };
    } catch (error) {
        console.error('Session verification failed:', error);
        return { success: false, error: 'Invalid session' };
    }
}