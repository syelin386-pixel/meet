import { NextResponse } from "next/server";

import { supabaseAdmin } from
  "../../../../lib/supabaseAdmin";

export async function GET(request) {
  try {
    const requestUrl =
      new URL(request.url);

    const origin =
      requestUrl.origin;

    const code =
      requestUrl.searchParams.get(
        "code"
      );

    const kakaoError =
      requestUrl.searchParams.get(
        "error"
      );

    if (kakaoError) {
      console.error(
        "Kakao auth error:",
        kakaoError
      );

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

    /* =========================
       인가코드 → 토큰
    ========================= */

    const tokenBody =
      new URLSearchParams();

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

    if (
      process.env.KAKAO_CLIENT_SECRET
    ) {
      tokenBody.set(
        "client_secret",
        process.env.KAKAO_CLIENT_SECRET
      );
    }

    const tokenResponse =
      await fetch(
        "https://kauth.kakao.com/oauth/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded;charset=utf-8",
          },

          body:
            tokenBody.toString(),

          cache: "no-store",
        }
      );

    const tokenData =
      await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "Kakao token error:",
        tokenData
      );

      return NextResponse.redirect(
        `${origin}/?login_error=token`
      );
    }

    /* =========================
       카카오 사용자 ID 조회
    ========================= */

    const userResponse =
      await fetch(
        "https://kapi.kakao.com/v2/user/me",
        {
          headers: {
            Authorization:
              `Bearer ${tokenData.access_token}`,
          },

          cache: "no-store",
        }
      );

    const kakaoUser =
      await userResponse.json();

    if (!userResponse.ok) {
      console.error(
        "Kakao user error:",
        kakaoUser
      );

      return NextResponse.redirect(
        `${origin}/?login_error=user`
      );
    }

    const kakaoId =
      String(kakaoUser.id);

    /* =========================
       MEET 사용자 찾기/생성
    ========================= */

    let {
      data: meetUser,
      error: userFindError,
    } = await supabaseAdmin
      .from("meet_users")
      .select("*")
      .eq(
        "kakao_id",
        kakaoId
      )
      .maybeSingle();

    if (userFindError) {
      throw userFindError;
    }

    if (!meetUser) {
      const {
        data: newUser,
        error: createError,
      } = await supabaseAdmin
        .from("meet_users")
        .insert({
          kakao_id: kakaoId,
        })
        .select("*")
        .single();

      if (createError) {
        throw createError;
      }

      meetUser = newUser;
    }

    /* =========================
       카카오 토큰 DB 저장
    ========================= */

    const now =
      Date.now();

    const accessExpiresAt =
      new Date(
        now +
          tokenData.expires_in *
            1000
      ).toISOString();

    let refreshExpiresAt =
      null;

    if (
      tokenData.refresh_token_expires_in
    ) {
      refreshExpiresAt =
        new Date(
          now +
            tokenData
              .refresh_token_expires_in *
              1000
        ).toISOString();
    }

    const {
      error: tokenSaveError,
    } = await supabaseAdmin
      .from("kakao_tokens")
      .upsert({
        user_id:
          meetUser.id,

        access_token:
          tokenData.access_token,

        refresh_token:
          tokenData.refresh_token,

        access_expires_at:
          accessExpiresAt,

        refresh_expires_at:
          refreshExpiresAt,

        updated_at:
          new Date().toISOString(),
      });

    if (tokenSaveError) {
      throw tokenSaveError;
    }

    /* =========================
       MEET 로그인 쿠키
    ========================= */

    const response =
      NextResponse.redirect(
        origin
      );

    response.cookies.set(
      "meet_user_id",
      meetUser.id,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge:
          60 * 60 * 24 * 30,
      }
    );

    return response;

  } catch (error) {
    console.error(
      "Callback error:",
      error
    );

    const origin =
      new URL(
        request.url
      ).origin;

    return NextResponse.redirect(
      `${origin}/?login_error=unknown`
    );
  }
}