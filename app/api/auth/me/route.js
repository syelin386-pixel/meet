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
      user,
    });
  } catch (error) {
    console.error(
      "AUTH ME ERROR:",
      error
    );

    return NextResponse.json({
      loggedIn: false,
      user: null,
    });
  }
}