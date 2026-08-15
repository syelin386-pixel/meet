import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url);

    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");
    const origin = requestUrl.origin;

    if (error) {
      return NextResponse.redirect(
        `${origin}/?login_error=kakao`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${origin}/?login_error=no_code`
      );
    }

    const redirectUri =
      `${origin}/api/kakao/callback`;

    const tokenBody = new URLSearchParams();

    tokenBody.set(
      "grant_type",
      "authorization_code"
    );

    tokenBody.set(
      "client_id",
      process.env.KAKAO_REST_API_KEY
    );

    tokenBody.set(
      "redirect_uri",
      redirectUri
    );

    tokenBody.set(
      "code",
      code
    );

    if (process.env.KAKAO_CLIENT_SECRET) {
      tokenBody.set(
        "client_secret",
        process.env.KAKAO_CLIENT_SECRET
      );
    }

    const tokenResponse = await fetch(
      "https://kauth.kakao.com/oauth/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded;charset=utf-8",
        },

        body: tokenBody.toString(),
        cache: "no-store",
      }
    );

    const tokenData =
      await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(tokenData);

      return NextResponse.redirect(
        `${origin}/?login_error=token`
      );
    }

    const accessToken =
      tokenData.access_token;

    const refreshToken =
      tokenData.refresh_token || "";

    const userResponse = await fetch(
      "https://kapi.kakao.com/v2/user/me",
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },

        cache: "no-store",
      }
    );

    const kakaoUser =
      await userResponse.json();

    if (!userResponse.ok) {
      return NextResponse.redirect(
        `${origin}/?login_error=user`
      );
    }

    const response =
      NextResponse.redirect(origin);

    const cookieOptions = {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
    };

    response.cookies.set(
      "meet_kakao_id",
      String(kakaoUser.id),
      {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    response.cookies.set(
      "meet_kakao_access_token",
      accessToken,
      {
        ...cookieOptions,
        maxAge:
          tokenData.expires_in || 21600,
      }
    );

    if (refreshToken) {
      response.cookies.set(
        "meet_kakao_refresh_token",
        refreshToken,
        {
          ...cookieOptions,
          maxAge:
            tokenData.refresh_token_expires_in ||
            60 * 60 * 24 * 30,
        }
      );
    }

    return response;
  } catch (error) {
    console.error(error);

    const origin =
      new URL(request.url).origin;

    return NextResponse.redirect(
      `${origin}/?login_error=unknown`
    );
  }
}