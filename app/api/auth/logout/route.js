import { NextResponse } from "next/server";

import {
  deleteCurrentSession,
  SESSION_COOKIE_NAME,
} from "../../../../lib/auth";

export async function POST() {
  try {
    await deleteCurrentSession();

    const response =
      NextResponse.json({
        success: true,
      });

    response.cookies.delete(
      SESSION_COOKIE_NAME
    );

    return response;
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    const response =
      NextResponse.json({
        success: true,
      });

    response.cookies.delete(
      SESSION_COOKIE_NAME
    );

    return response;
  }
}