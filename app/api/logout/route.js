import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get(
      "meet_kakao_access_token"
    )?.value;

  if (accessToken) {
    try {
      await fetch(
        "https://kapi.kakao.com/v1/user/logout",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/x-www-form-urlencoded;charset=utf-8",
          },

          cache: "no-store",
        }
      );
    } catch (error) {
      console.error(
        "Kakao logout error:",
        error
      );
    }
  }

  const response =
    NextResponse.json({
      success: true,
    });

  const clearOptions = {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(
    "meet_kakao_id",
    "",
    clearOptions
  );

  response.cookies.set(
    "meet_kakao_access_token",
    "",
    clearOptions
  );

  response.cookies.set(
    "meet_kakao_refresh_token",
    "",
    clearOptions
  );

  return response;
}