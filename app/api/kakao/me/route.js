import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { supabaseAdmin } from
  "../../../../lib/supabaseAdmin";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const userId =
      cookieStore.get(
        "meet_user_id"
      )?.value;

    if (!userId) {
      return NextResponse.json({
        loggedIn: false,
        user: null,
      });
    }

    const {
      data: user,
      error,
    } = await supabaseAdmin
      .from("meet_users")
      .select(
        "id, kakao_id, nickname"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    if (
      error ||
      !user
    ) {
      return NextResponse.json({
        loggedIn: false,
        user: null,
      });
    }

    return NextResponse.json({
      loggedIn: true,
      user,
    });
  } catch (error) {
    console.error(
      error
    );

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