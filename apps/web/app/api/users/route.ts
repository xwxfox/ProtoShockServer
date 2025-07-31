import { ProtoDBClass, users } from "@protoshock/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Force dynamic rendering for this route
export async function GET() {
    try {
        const db = new ProtoDBClass();
        await db.init();
        const allUsers = await db.database.select().from(users);
        return NextResponse.json(allUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}