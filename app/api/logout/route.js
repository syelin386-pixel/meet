import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { supabaseAdmin } from
  "../../../../lib/supabaseAdmin";

export async function POST() {
  try {
    const cookieStore =
      await cookies();

    const userId =
      cookieStore.get(
        "meet_user_id"
      )?.value;

    if (userId) {
      const {
        data: tokenRow,
      } = await supabaseAdmin
        .from(
          "kakao_tokens"
        )
        .select(
          "access_token"
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

      if (
        tokenRow?.access_token
      ) {
        await fetch(
          "https://kapi.kakao.com/v1/user/logout",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${tokenRow.access_token}`,
            },

            cache: "no-store",
          }
        ).catch(() => {});
      }
    }

    const response =
      NextResponse.json({
        success: true,
      });

    response.cookies.delete(
      "meet_user_id"
    );

    return response;

  } catch (error) {
    console.error(error);

    const response =
      NextResponse.json({
        success: true,
      });

    response.cookies.delete(
      "meet_user_id"
    );

    return response;
  }
}