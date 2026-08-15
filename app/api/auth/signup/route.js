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

    const nickname =
      String(
        body.nickname || ""
      ).trim();

    if (
      username.length < 4
    ) {
      return NextResponse.json(
        {
          error:
            "아이디는 4자 이상으로 만들어주세요.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[a-z0-9_]+$/.test(
        username
      )
    ) {
      return NextResponse.json(
        {
          error:
            "아이디는 영문 소문자, 숫자, _ 만 사용할 수 있어요.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "비밀번호는 8자 이상이어야 해요.",
        },
        {
          status: 400,
        }
      );
    }

    if (!nickname) {
      return NextResponse.json(
        {
          error:
            "닉네임을 입력해주세요.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("meet_users")
      .select("id")
      .eq(
        "username",
        username
      )
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            "이미 사용 중인 아이디예요.",
        },
        {
          status: 409,
        }
      );
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    const {
      data: user,
      error: userError,
    } = await supabaseAdmin
      .from("meet_users")
      .insert({
        username,
        password_hash:
          passwordHash,
        nickname,
      })
      .select(
        "id, username, nickname"
      )
      .single();

    if (userError) {
      throw userError;
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
        user,
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
      "SIGNUP REAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "회원가입 중 오류가 발생했어요.",
      },
      {
        status: 500,
      }
    );
  }
}