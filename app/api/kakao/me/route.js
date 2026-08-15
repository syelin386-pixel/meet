import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const kakaoId =
      cookieStore.get("meet_kakao_id")?.value;

    if (!kakaoId) {
      return NextResponse.json({
        loggedIn: false,
        user: null,
      });
    }

    return NextResponse.json({
      loggedIn: true,

      user: {
        id: kakaoId,
      },
    });
  } catch (error) {
    console.error("MEET session error:", error);

    return NextResponse.json(
      {
        loggedIn: false,
        user: null,
      },
      {
        status: 500,
      }
    );
  }
}