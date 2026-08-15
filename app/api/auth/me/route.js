import { NextResponse } from "next/server";

import {
  getCurrentUser,
} from "../../../../lib/auth";

export async function GET() {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        loggedIn: false,
        user: null,
      });
    }

    return NextResponse.json({
      loggedIn: true,

      user: {
        id: user.id,
        username:
          user.username,
        nickname:
          user.nickname,
      },
    });
  } catch (error) {
    console.error(
      "Auth me error:",
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