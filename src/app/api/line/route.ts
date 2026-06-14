import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ตรงนี้คือที่ที่พี่เขียน Logic ของ LINE API ไว้ครับ
    console.log("Received data:", body);

    return NextResponse.json({ message: "API Line Received" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "API Line is active" });
}
