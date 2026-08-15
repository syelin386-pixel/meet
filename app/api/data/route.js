import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { supabaseAdmin } from
  "../../../lib/supabaseAdmin";

/* =========================================
   로그인 사용자
========================================= */

async function getCurrentUser() {
  const cookieStore =
    await cookies();

  const userId =
    cookieStore.get(
      "meet_user_id"
    )?.value;

  if (!userId) {
    return null;
  }

  const {
    data,
  } = await supabaseAdmin
    .from("meet_users")
    .select("*")
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  return data || null;
}

/* =========================================
   카카오 토큰 갱신
========================================= */

async function getKakaoAccessToken(
  userId
) {
  const {
    data: tokenRow,
    error,
  } = await supabaseAdmin
    .from("kakao_tokens")
    .select("*")
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (
    error ||
    !tokenRow
  ) {
    throw new Error(
      "카카오 연결 정보가 없습니다."
    );
  }

  const expiresAt =
    tokenRow.access_expires_at
      ? new Date(
          tokenRow.access_expires_at
        ).getTime()
      : 0;

  // 1분 이상 남아있으면 그대로 사용
  if (
    tokenRow.access_token &&
    expiresAt >
      Date.now() +
        60 * 1000
  ) {
    return tokenRow.access_token;
  }

  if (
    !tokenRow.refresh_token
  ) {
    throw new Error(
      "카카오 로그인을 다시 해주세요."
    );
  }

  const body =
    new URLSearchParams();

  body.set(
    "grant_type",
    "refresh_token"
  );

  body.set(
    "client_id",
    process.env.KAKAO_REST_API_KEY
  );

  body.set(
    "refresh_token",
    tokenRow.refresh_token
  );

  if (
    process.env.KAKAO_CLIENT_SECRET
  ) {
    body.set(
      "client_secret",
      process.env.KAKAO_CLIENT_SECRET
    );
  }

  const response =
    await fetch(
      "https://kauth.kakao.com/oauth/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded;charset=utf-8",
        },

        body:
          body.toString(),

        cache: "no-store",
      }
    );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "Kakao refresh error:",
      result
    );

    throw new Error(
      "카카오 로그인을 다시 해주세요."
    );
  }

  const updateData = {
    access_token:
      result.access_token,

    access_expires_at:
      new Date(
        Date.now() +
          result.expires_in *
            1000
      ).toISOString(),

    updated_at:
      new Date().toISOString(),
  };

  // 카카오가 새 refresh token을 줄 때만 교체
  if (
    result.refresh_token
  ) {
    updateData.refresh_token =
      result.refresh_token;

    if (
      result.refresh_token_expires_in
    ) {
      updateData.refresh_expires_at =
        new Date(
          Date.now() +
            result
              .refresh_token_expires_in *
              1000
        ).toISOString();
    }
  }

  await supabaseAdmin
    .from("kakao_tokens")
    .update(updateData)
    .eq(
      "user_id",
      userId
    );

  return result.access_token;
}

/* =========================================
   카카오 일정 생성
========================================= */

async function createKakaoEvent(
  userId,
  meeting
) {
  const accessToken =
    await getKakaoAccessToken(
      userId
    );

  const start =
    new Date(
      `${meeting.date}T${meeting.startTime}:00+09:00`
    );

  let end;

  if (
    meeting.endTime
  ) {
    end =
      new Date(
        `${meeting.date}T${meeting.endTime}:00+09:00`
      );

    if (
      end <= start
    ) {
      end.setDate(
        end.getDate() +
          1
      );
    }
  } else {
    end =
      new Date(
        start.getTime() +
          2 *
            60 *
            60 *
            1000
      );
  }

  const event = {
    title:
      meeting.title,

    time: {
      start_at:
        start.toISOString(),

      end_at:
        end.toISOString(),

      time_zone:
        "Asia/Seoul",

      all_day:
        false,

      lunar:
        false,
    },

    description:
      meeting.plan || "",

    reminders: [
      30,
    ],
  };

  if (
    meeting.place
  ) {
    event.location = {
      name:
        meeting.place,
    };
  }

  const form =
    new URLSearchParams();

  form.set(
    "calendar_id",
    "primary"
  );

  form.set(
    "event",
    JSON.stringify(
      event
    )
  );

  const response =
    await fetch(
      "https://kapi.kakao.com/v2/api/calendar/create/event",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/x-www-form-urlencoded;charset=utf-8",
        },

        body:
          form.toString(),

        cache: "no-store",
      }
    );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "Calendar create error:",
      result
    );

    throw new Error(
      "톡캘린더 일정 생성 실패"
    );
  }

  return result.event_id;
}

/* =========================================
   카카오 일정 삭제
========================================= */

async function deleteKakaoEvent(
  userId,
  eventId
) {
  if (!eventId) {
    return;
  }

  const accessToken =
    await getKakaoAccessToken(
      userId
    );

  const url =
    new URL(
      "https://kapi.kakao.com/v2/api/calendar/delete/event"
    );

  url.searchParams.set(
    "event_id",
    eventId
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "DELETE",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },

        cache: "no-store",
      }
    );

  if (!response.ok) {
    const result =
      await response.text();

    console.error(
      "Calendar delete:",
      result
    );
  }
}

/* =========================================
   카카오 할 일 생성
========================================= */

async function createKakaoTask(
  userId,
  title
) {
  const accessToken =
    await getKakaoAccessToken(
      userId
    );

  const form =
    new URLSearchParams();

  form.set(
    "task",
    JSON.stringify({
      content:
        title,
    })
  );

  const response =
    await fetch(
      "https://kapi.kakao.com/v1/api/calendar/create/task",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/x-www-form-urlencoded;charset=utf-8",
        },

        body:
          form.toString(),

        cache: "no-store",
      }
    );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "Kakao task:",
      result
    );

    throw new Error(
      "카카오 내 할 일 생성 실패"
    );
  }

  return result.task_id;
}

/* =========================================
   카카오 할 일 완료
========================================= */

async function completeKakaoTask(
  userId,
  taskId,
  complete
) {
  if (!taskId) {
    return;
  }

  const accessToken =
    await getKakaoAccessToken(
      userId
    );

  const form =
    new URLSearchParams();

  form.set(
    "task_id",
    taskId
  );

  form.set(
    "complete",
    String(
      complete
    )
  );

  const response =
    await fetch(
      "https://kapi.kakao.com/v1/api/calendar/complete/task",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/x-www-form-urlencoded;charset=utf-8",
        },

        body:
          form.toString(),

        cache: "no-store",
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    console.error(
      "Task complete:",
      text
    );
  }
}

/* =========================================
   카카오 할 일 삭제
========================================= */

async function deleteKakaoTask(
  userId,
  taskId
) {
  if (!taskId) {
    return;
  }

  const accessToken =
    await getKakaoAccessToken(
      userId
    );

  const url =
    new URL(
      "https://kapi.kakao.com/v1/api/calendar/delete/task"
    );

  url.searchParams.set(
    "task_id",
    taskId
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "DELETE",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },

        cache: "no-store",
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    console.error(
      "Task delete:",
      text
    );
  }
}

/* =========================================
   전체 데이터 조회
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

    const [
      meetingsResult,
      placesResult,
      todosResult,
    ] = await Promise.all([
      supabaseAdmin
        .from(
          "user_meetings"
        )
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .order(
          "meeting_date",
          {
            ascending:
              true,
          }
        ),

      supabaseAdmin
        .from(
          "user_places"
        )
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabaseAdmin
        .from(
          "user_todos"
        )
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

    return NextResponse.json({
      user: {
        id:
          user.id,

        nickname:
          user.nickname,
      },

      meetings:
        meetingsResult.data ||
        [],

      places:
        placesResult.data ||
        [],

      todos:
        todosResult.data ||
        [],
    });

  } catch (error) {
    console.error(error);

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

/* =========================================
   데이터 변경
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

    /* =========================
       NICKNAME
    ========================= */

    if (
      action ===
      "saveNickname"
    ) {
      const nickname =
        String(
          body.nickname ||
            ""
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

      await supabaseAdmin
        .from("meet_users")
        .update({
          nickname,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          user.id
        );

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================
       MEETING CREATE
    ========================= */

    if (
      action ===
      "createMeeting"
    ) {
      const meeting =
        body.meeting;

      let kakaoEventId =
        null;

      let calendarError =
        null;

      if (
        body.addToKakao
      ) {
        try {
          kakaoEventId =
            await createKakaoEvent(
              user.id,
              meeting
            );
        } catch (
          error
        ) {
          calendarError =
            error.message;
        }
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "user_meetings"
        )
        .insert({
          user_id:
            user.id,

          title:
            meeting.title,

          meeting_date:
            meeting.date,

          start_time:
            meeting.startTime,

          end_time:
            meeting.endTime ||
            null,

          plan:
            meeting.plan ||
            null,

          place:
            meeting.place ||
            null,

          completed:
            false,

          kakao_event_id:
            kakaoEventId,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,

        meeting:
          data,

        calendarSynced:
          Boolean(
            kakaoEventId
          ),

        calendarError,
      });
    }

    /* =========================
       MEETING TOGGLE
    ========================= */

    if (
      action ===
      "toggleMeeting"
    ) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "user_meetings"
        )
        .update({
          completed:
            Boolean(
              body.completed
            ),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        meeting:
          data,
      });
    }

    /* =========================
       MEETING DELETE
    ========================= */

    if (
      action ===
      "deleteMeeting"
    ) {
      const {
        data: meeting,
      } = await supabaseAdmin
        .from(
          "user_meetings"
        )
        .select("*")
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (
        meeting?.kakao_event_id
      ) {
        await deleteKakaoEvent(
          user.id,
          meeting.kakao_event_id
        );
      }

      await supabaseAdmin
        .from(
          "user_meetings"
        )
        .delete()
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        );

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================
       PLACE CREATE
    ========================= */

    if (
      action ===
      "createPlace"
    ) {
      const place =
        body.place;

      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "user_places"
        )
        .insert({
          user_id:
            user.id,

          name:
            place.name,

          area:
            place.area ||
            null,

          memo:
            place.memo ||
            null,

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
        place:
          data,
      });
    }

    /* =========================
       PLACE STATUS
    ========================= */

    if (
      action ===
      "changePlaceStatus"
    ) {
      await supabaseAdmin
        .from(
          "user_places"
        )
        .update({
          status:
            body.status,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        );

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================
       PLACE DELETE
    ========================= */

    if (
      action ===
      "deletePlace"
    ) {
      await supabaseAdmin
        .from(
          "user_places"
        )
        .delete()
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        );

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================
       TODO CREATE
    ========================= */

    if (
      action ===
      "createTodo"
    ) {
      const title =
        String(
          body.title ||
            ""
        ).trim();

      let kakaoTaskId =
        null;

      let kakaoError =
        null;

      if (
        body.addToKakao
      ) {
        try {
          kakaoTaskId =
            await createKakaoTask(
              user.id,
              title
            );
        } catch (
          error
        ) {
          kakaoError =
            error.message;
        }
      }

      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "user_todos"
        )
        .insert({
          user_id:
            user.id,

          title,

          completed:
            false,

          kakao_task_id:
            kakaoTaskId,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,

        todo:
          data,

        kakaoSynced:
          Boolean(
            kakaoTaskId
          ),

        kakaoError,
      });
    }

    /* =========================
       TODO TOGGLE
    ========================= */

    if (
      action ===
      "toggleTodo"
    ) {
      const {
        data: todo,
      } = await supabaseAdmin
        .from(
          "user_todos"
        )
        .select("*")
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (
        todo?.kakao_task_id
      ) {
        await completeKakaoTask(
          user.id,
          todo.kakao_task_id,
          Boolean(
            body.completed
          )
        );
      }

      await supabaseAdmin
        .from(
          "user_todos"
        )
        .update({
          completed:
            Boolean(
              body.completed
            ),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        );

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================
       TODO DELETE
    ========================= */

    if (
      action ===
      "deleteTodo"
    ) {
      const {
        data: todo,
      } = await supabaseAdmin
        .from(
          "user_todos"
        )
        .select("*")
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (
        todo?.kakao_task_id
      ) {
        await deleteKakaoTask(
          user.id,
          todo.kakao_task_id
        );
      }

      await supabaseAdmin
        .from(
          "user_todos"
        )
        .delete()
        .eq(
          "id",
          body.id
        )
        .eq(
          "user_id",
          user.id
        );

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
      "Data API error:",
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