import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Hello, world!",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
}
