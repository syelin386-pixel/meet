import crypto from "node:crypto";
import { cookies } from "next/headers";

import { supabaseAdmin } from "./supabaseAdmin";

export const SESSION_COOKIE_NAME =
  "meet_session";

const SESSION_DAYS = 30;

export function hashSessionToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function createSession(userId) {
  const token =
    crypto.randomBytes(32).toString("hex");

  const tokenHash =
    hashSessionToken(token);

  const expiresAt =
    new Date(
      Date.now() +
        SESSION_DAYS *
          24 *
          60 *
          60 *
          1000
    );

  const { error } =
    await supabaseAdmin
      .from("meet_sessions")
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at:
          expiresAt.toISOString(),
      });

  if (error) {
    throw error;
  }

  return {
    token,
    expiresAt,
  };
}

export async function getCurrentUser() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME
    )?.value;

  if (!token) {
    return null;
  }

  const tokenHash =
    hashSessionToken(token);

  const {
    data: session,
    error,
  } = await supabaseAdmin
    .from("meet_sessions")
    .select(
      `
      id,
      user_id,
      expires_at,
      meet_users (
        id,
        username,
        nickname
      )
      `
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (
    error ||
    !session ||
    !session.meet_users
  ) {
    return null;
  }

  if (
    new Date(session.expires_at) <=
    new Date()
  ) {
    await supabaseAdmin
      .from("meet_sessions")
      .delete()
      .eq("id", session.id);

    return null;
  }

  return session.meet_users;
}

export async function deleteCurrentSession() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME
    )?.value;

  if (!token) {
    return;
  }

  const tokenHash =
    hashSessionToken(token);

  await supabaseAdmin
    .from("meet_sessions")
    .delete()
    .eq("token_hash", tokenHash);
}