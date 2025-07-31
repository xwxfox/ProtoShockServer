import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET!;

export async function middleware(req: NextRequest) {
    const session = req.cookies.get('admin_session')?.value;
    if (!session) return NextResponse.redirect(new URL('/admin/login', req.url));

    try {
        await jwtVerify(session, new TextEncoder().encode(SESSION_SECRET));
        return NextResponse.next();
    } catch {
        return NextResponse.redirect(new URL('/admin/login', req.url));
    }
}

export const config = {
    matcher: ['/admin((?!/login).*)'],
};