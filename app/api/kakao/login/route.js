import { NextResponse } from "next/server";

export async function GET(request) {
  const origin = new URL(request.url).origin;

  const redirectUri = `${origin}/api/kakao/callback`;

  const kakaoAuthUrl = new URL(
    "https://kauth.kakao.com/oauth/authorize"
  );

  kakaoAuthUrl.searchParams.set(
    "client_id",
    process.env.KAKAO_REST_API_KEY
  );

  kakaoAuthUrl.searchParams.set(
    "redirect_uri",
    redirectUri
  );

  kakaoAuthUrl.searchParams.set(
    "response_type",
    "code"
  );

  return NextResponse.redirect(
    kakaoAuthUrl.toString()
  );
}