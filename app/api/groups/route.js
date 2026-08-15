import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  supabaseAdmin,
} from "../../../lib/supabaseAdmin";

import {
  getCurrentUser,
} from "../../../lib/auth";


function makeInviteCode() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < 6; i++) {
    const index =
      crypto.randomInt(
        0,
        chars.length
      );

    result += chars[index];
  }

  return result;
}


async function makeUniqueInviteCode() {
  for (
    let attempt = 0;
    attempt < 10;
    attempt++
  ) {
    const code =
      makeInviteCode();

    const {
      data,
    } = await supabaseAdmin
      .from("meet_groups")
      .select("id")
      .eq(
        "invite_code",
        code
      )
      .maybeSingle();

    if (!data) {
      return code;
    }
  }

  throw new Error(
    "초대코드를 만들지 못했어요."
  );
}


/* =========================================
   내 그룹 목록
========================================= */

export async function GET() {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "로그인이 필요합니다.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: memberships,
      error,
    } = await supabaseAdmin
      .from("meet_group_members")
      .select(
        `
        role,
        joined_at,

        meet_groups (
          id,
          name,
          invite_code,
          owner_id,
          created_at
        )
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .order(
        "joined_at",
        {
          ascending: true,
        }
      );

    if (error) {
      throw error;
    }

    const groups = [];

    for (
      const membership
      of memberships || []
    ) {
      const group =
        membership.meet_groups;

      if (!group) continue;

      const {
        data: members,
      } = await supabaseAdmin
        .from(
          "meet_group_members"
        )
        .select(
          `
          role,

          meet_users (
            id,
            username,
            nickname
          )
          `
        )
        .eq(
          "group_id",
          group.id
        )
        .order(
          "joined_at",
          {
            ascending: true,
          }
        );

      groups.push({
        ...group,

        myRole:
          membership.role,

        members:
          (members || [])
            .map(
              (member) => ({
                role:
                  member.role,

                ...(member.meet_users ||
                  {}),
              })
            )
            .filter(
              (member) =>
                member.id
            ),
      });
    }

    return NextResponse.json({
      groups,
    });

  } catch (error) {
    console.error(
      "GROUP GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "그룹을 불러오지 못했어요.",
      },
      {
        status: 500,
      }
    );
  }
}


/* =========================================
   생성 / 참여
========================================= */

export async function POST(
  request
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "로그인이 필요합니다.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const action =
      body.action;


    /* =====================================
       그룹 생성
    ===================================== */

    if (
      action ===
      "createGroup"
    ) {
      const name =
        String(
          body.name || ""
        ).trim();

      if (!name) {
        return NextResponse.json(
          {
            error:
              "그룹 이름을 입력해주세요.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        name.length > 30
      ) {
        return NextResponse.json(
          {
            error:
              "그룹 이름은 30자 이하로 만들어주세요.",
          },
          {
            status: 400,
          }
        );
      }

      const inviteCode =
        await makeUniqueInviteCode();

      const {
        data: group,
        error: groupError,
      } = await supabaseAdmin
        .from("meet_groups")
        .insert({
          name,

          invite_code:
            inviteCode,

          owner_id:
            user.id,
        })
        .select("*")
        .single();

      if (groupError) {
        throw groupError;
      }

      const {
        error: memberError,
      } = await supabaseAdmin
        .from(
          "meet_group_members"
        )
        .insert({
          group_id:
            group.id,

          user_id:
            user.id,

          role:
            "owner",
        });

      if (memberError) {
        throw memberError;
      }

      return NextResponse.json({
        success: true,
        group,
      });
    }


    /* =====================================
       초대코드로 참여
    ===================================== */

    if (
      action ===
      "joinGroup"
    ) {
      const inviteCode =
        String(
          body.inviteCode ||
            ""
        )
          .trim()
          .toUpperCase();

      if (!inviteCode) {
        return NextResponse.json(
          {
            error:
              "초대코드를 입력해주세요.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: group,
        error: groupError,
      } = await supabaseAdmin
        .from("meet_groups")
        .select("*")
        .eq(
          "invite_code",
          inviteCode
        )
        .maybeSingle();

      if (
        groupError ||
        !group
      ) {
        return NextResponse.json(
          {
            error:
              "존재하지 않는 초대코드예요.",
          },
          {
            status: 404,
          }
        );
      }

      const {
        data: existing,
      } = await supabaseAdmin
        .from(
          "meet_group_members"
        )
        .select("group_id")
        .eq(
          "group_id",
          group.id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          {
            error:
              "이미 참여 중인 그룹이에요.",
          },
          {
            status: 409,
          }
        );
      }

      const {
        error,
      } = await supabaseAdmin
        .from(
          "meet_group_members"
        )
        .insert({
          group_id:
            group.id,

          user_id:
            user.id,

          role:
            "member",
        });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        group,
      });
    }


    return NextResponse.json(
      {
        error:
          "잘못된 요청입니다.",
      },
      {
        status: 400,
      }
    );

  } catch (error) {
    console.error(
      "GROUP POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "그룹 작업 중 오류가 발생했어요.",
      },
      {
        status: 500,
      }
    );
  }
}