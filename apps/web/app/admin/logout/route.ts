import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    return new Response(null, { status: 204 });
}

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    return new Response(null, { status: 204 });
}