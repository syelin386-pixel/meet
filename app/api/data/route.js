import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getCurrentUser } from "../../../lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "로그인이 필요합니다.",
        },
        {
          status: 401,
        }
      );
    }

    const [
      meetingsResult,
      placesResult,
      todosResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("user_meetings")
        .select("*")
        .eq("user_id", user.id)
        .order("meeting_date", {
          ascending: true,
        }),

      supabaseAdmin
        .from("user_places")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("user_todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (meetingsResult.error) {
      throw meetingsResult.error;
    }

    if (placesResult.error) {
      throw placesResult.error;
    }

    if (todosResult.error) {
      throw todosResult.error;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
      },

      meetings:
        meetingsResult.data || [],

      places:
        placesResult.data || [],

      todos:
        todosResult.data || [],
    });
  } catch (error) {
    console.error(
      "GET /api/data:",
      error
    );

    return NextResponse.json(
      {
        error:
          "데이터를 불러오지 못했어요.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "로그인이 필요합니다.",
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

    /* =========================
       NICKNAME
    ========================= */

    if (action === "saveNickname") {
      const nickname =
        String(
          body.nickname || ""
        ).trim();

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

      const { error } =
        await supabaseAdmin
          .from("meet_users")
          .update({
            nickname,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", user.id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================
       MEETING CREATE
    ========================= */

    if (action === "createMeeting") {
      const meeting =
        body.meeting || {};

      const title =
        String(
          meeting.title || ""
        ).trim();

      if (!title) {
        return NextResponse.json(
          {
            error:
              "약속 이름을 입력해주세요.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("user_meetings")
        .insert({
          user_id: user.id,

          title,

          meeting_date:
            meeting.date || null,

          start_time:
            meeting.startTime || null,

          end_time:
            meeting.endTime || null,

          plan:
            meeting.plan || null,

          place:
            meeting.place || null,

          completed: false,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        meeting: data,
      });
    }

    /* =========================
       MEETING TOGGLE
    ========================= */

    if (action === "toggleMeeting") {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("user_meetings")
        .update({
          completed:
            Boolean(
              body.completed
            ),

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", body.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        meeting: data,
      });
    }

    /* =========================
       MEETING DELETE
    ========================= */

    if (action === "deleteMeeting") {
      const { error } =
        await supabaseAdmin
          .from("user_meetings")
          .delete()
          .eq("id", body.id)
          .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================
       PLACE CREATE
    ========================= */

    if (action === "createPlace") {
      const place =
        body.place || {};

      const name =
        String(
          place.name || ""
        ).trim();

      if (!name) {
        return NextResponse.json(
          {
            error:
              "장소 이름을 입력해주세요.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("user_places")
        .insert({
          user_id: user.id,

          name,

          area:
            place.area || null,

          memo:
            place.memo || null,

          category:
            place.category ||
            "맛집",

          status:
            place.status ||
            "가고싶어",
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        place: data,
      });
    }

    /* =========================
       PLACE STATUS
    ========================= */

    if (
      action ===
      "changePlaceStatus"
    ) {
      const allowedStatus = [
        "가고싶어",
        "다녀왔어",
        "최애",
      ];

      if (
        !allowedStatus.includes(
          body.status
        )
      ) {
        return NextResponse.json(
          {
            error:
              "잘못된 상태입니다.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("user_places")
        .update({
          status:
            body.status,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", body.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        place: data,
      });
    }

    /* =========================
       PLACE DELETE
    ========================= */

    if (action === "deletePlace") {
      const { error } =
        await supabaseAdmin
          .from("user_places")
          .delete()
          .eq("id", body.id)
          .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================
       TODO CREATE
    ========================= */

    if (action === "createTodo") {
      const title =
        String(
          body.title || ""
        ).trim();

      if (!title) {
        return NextResponse.json(
          {
            error:
              "할 일을 입력해주세요.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("user_todos")
        .insert({
          user_id: user.id,
          title,
          completed: false,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        todo: data,
      });
    }

    /* =========================
       TODO TOGGLE
    ========================= */

    if (action === "toggleTodo") {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("user_todos")
        .update({
          completed:
            Boolean(
              body.completed
            ),

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", body.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        todo: data,
      });
    }

    /* =========================
       TODO DELETE
    ========================= */

    if (action === "deleteTodo") {
      const { error } =
        await supabaseAdmin
          .from("user_todos")
          .delete()
          .eq("id", body.id)
          .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error:
          "알 수 없는 요청입니다.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/data:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}