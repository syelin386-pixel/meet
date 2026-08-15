import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

import {
  createSession,
  SESSION_COOKIE_NAME,
} from "../../../../lib/auth";

export async function POST(request) {
  try {
    const body =
      await request.json();

    const username =
      String(
        body.username || ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        body.password || ""
      );

    if (
      !username ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "아이디와 비밀번호를 입력해주세요.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: user,
      error,
    } = await supabaseAdmin
      .from("meet_users")
      .select(
        "id, username, nickname, password_hash"
      )
      .eq(
        "username",
        username
      )
      .maybeSingle();

    if (
      error ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "아이디 또는 비밀번호가 맞지 않아요.",
        },
        {
          status: 401,
        }
      );
    }

    const match =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!match) {
      return NextResponse.json(
        {
          error:
            "아이디 또는 비밀번호가 맞지 않아요.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      token,
      expiresAt,
    } = await createSession(
      user.id
    );

    const response =
      NextResponse.json({
        success: true,

        user: {
          id: user.id,
          username:
            user.username,
          nickname:
            user.nickname,
        },
      });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        expires:
          expiresAt,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "LOGIN REAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "로그인 중 오류가 발생했어요.",
      },
      {
        status: 500,
      }
    );
  }
}