import { NextResponse } from "next/server";

// Liveness probe for Docker and load balancers.
export function GET() {
  return NextResponse.json({ status: "ok", service: "laminar", time: new Date().toISOString() });
}
