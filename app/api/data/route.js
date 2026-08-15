import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../lib/supabaseAdmin";

import {
  getCurrentUser,
} from "../../../lib/auth";


async function checkGroupMembership(
  userId,
  groupId
) {
  const {
    data,
  } = await supabaseAdmin
    .from(
      "meet_group_members"
    )
    .select("group_id")
    .eq(
      "group_id",
      groupId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  return Boolean(data);
}


function getGroupId(
  value
) {
  if (
    !value ||
    value === "personal"
  ) {
    return null;
  }

  return value;
}


/* =========================================
   LOAD
========================================= */

export async function GET(
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

    const url =
      new URL(
        request.url
      );

    const groupId =
      getGroupId(
        url.searchParams.get(
          "groupId"
        )
      );

    if (groupId) {
      const member =
        await checkGroupMembership(
          user.id,
          groupId
        );

      if (!member) {
        return NextResponse.json(
          {
            error:
              "이 그룹에 접근할 수 없어요.",
          },
          {
            status: 403,
          }
        );
      }
    }


    let meetingsQuery =
      supabaseAdmin
        .from(
          "user_meetings"
        )
        .select("*");

    let placesQuery =
      supabaseAdmin
        .from(
          "user_places"
        )
        .select("*");

    let todosQuery =
      supabaseAdmin
        .from(
          "user_todos"
        )
        .select("*");


    if (groupId) {
      meetingsQuery =
        meetingsQuery.eq(
          "group_id",
          groupId
        );

      placesQuery =
        placesQuery.eq(
          "group_id",
          groupId
        );

      todosQuery =
        todosQuery.eq(
          "group_id",
          groupId
        );
    } else {
      meetingsQuery =
        meetingsQuery
          .eq(
            "user_id",
            user.id
          )
          .is(
            "group_id",
            null
          );

      placesQuery =
        placesQuery
          .eq(
            "user_id",
            user.id
          )
          .is(
            "group_id",
            null
          );

      todosQuery =
        todosQuery
          .eq(
            "user_id",
            user.id
          )
          .is(
            "group_id",
            null
          );
    }


    const [
      meetingsResult,
      placesResult,
      todosResult,
    ] = await Promise.all([
      meetingsQuery.order(
        "meeting_date",
        {
          ascending: true,
        }
      ),

      placesQuery.order(
        "created_at",
        {
          ascending: false,
        }
      ),

      todosQuery.order(
        "created_at",
        {
          ascending: false,
        }
      ),
    ]);


    if (
      meetingsResult.error
    ) {
      throw meetingsResult.error;
    }

    if (
      placesResult.error
    ) {
      throw placesResult.error;
    }

    if (
      todosResult.error
    ) {
      throw todosResult.error;
    }


    return NextResponse.json({
      user,

      groupId,

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
    console.error(
      "DATA GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "데이터를 불러오지 못했어요.",
      },
      {
        status: 500,
      }
    );
  }
}


/* =========================================
   ACTIONS
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

    const groupId =
      getGroupId(
        body.groupId
      );


    if (groupId) {
      const member =
        await checkGroupMembership(
          user.id,
          groupId
        );

      if (!member) {
        return NextResponse.json(
          {
            error:
              "이 그룹에 접근할 수 없어요.",
          },
          {
            status: 403,
          }
        );
      }
    }


    /* =====================================
       공통 조회 조건
    ===================================== */

    function scopeQuery(
      query
    ) {
      if (groupId) {
        return query.eq(
          "group_id",
          groupId
        );
      }

      return query
        .eq(
          "user_id",
          user.id
        )
        .is(
          "group_id",
          null
        );
    }


    /* =====================================
       MEETING CREATE
    ===================================== */

    if (
      action ===
      "createMeeting"
    ) {
      const meeting =
        body.meeting || {};

      const title =
        String(
          meeting.title ||
            ""
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
        .from(
          "user_meetings"
        )
        .insert({
          user_id:
            user.id,

          group_id:
            groupId,

          title,

          meeting_date:
            meeting.date ||
            null,

          start_time:
            meeting.startTime ||
            null,

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


    /* =====================================
       MEETING TOGGLE
    ===================================== */

    if (
      action ===
      "toggleMeeting"
    ) {
      let query =
        supabaseAdmin
          .from(
            "user_meetings"
          )
          .update({
            completed:
              Boolean(
                body.completed
              ),

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            body.id
          );

      query =
        scopeQuery(query);

      const {
        data,
        error,
      } = await query
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


    /* =====================================
       MEETING DELETE
    ===================================== */

    if (
      action ===
      "deleteMeeting"
    ) {
      let query =
        supabaseAdmin
          .from(
            "user_meetings"
          )
          .delete()
          .eq(
            "id",
            body.id
          );

      query =
        scopeQuery(query);

      const {
        error,
      } = await query;

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
      });
    }


    /* =====================================
       PLACE CREATE
    ===================================== */

    if (
      action ===
      "createPlace"
    ) {
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
        .from(
          "user_places"
        )
        .insert({
          user_id:
            user.id,

          group_id:
            groupId,

          name,

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


    /* =====================================
       PLACE STATUS
    ===================================== */

    if (
      action ===
      "changePlaceStatus"
    ) {
      const allowed = [
        "가고싶어",
        "다녀왔어",
        "최애",
      ];

      if (
        !allowed.includes(
          body.status
        )
      ) {
        return NextResponse.json(
          {
            error:
              "잘못된 상태예요.",
          },
          {
            status: 400,
          }
        );
      }

      let query =
        supabaseAdmin
          .from(
            "user_places"
          )
          .update({
            status:
              body.status,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            body.id
          );

      query =
        scopeQuery(query);

      const {
        data,
        error,
      } = await query
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


    /* =====================================
       PLACE DELETE
    ===================================== */

    if (
      action ===
      "deletePlace"
    ) {
      let query =
        supabaseAdmin
          .from(
            "user_places"
          )
          .delete()
          .eq(
            "id",
            body.id
          );

      query =
        scopeQuery(query);

      const {
        error,
      } = await query;

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
      });
    }


    /* =====================================
       TODO CREATE
    ===================================== */

    if (
      action ===
      "createTodo"
    ) {
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
        .from(
          "user_todos"
        )
        .insert({
          user_id:
            user.id,

          group_id:
            groupId,

          title,

          completed:
            false,
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


    /* =====================================
       TODO TOGGLE
    ===================================== */

    if (
      action ===
      "toggleTodo"
    ) {
      let query =
        supabaseAdmin
          .from(
            "user_todos"
          )
          .update({
            completed:
              Boolean(
                body.completed
              ),

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            body.id
          );

      query =
        scopeQuery(query);

      const {
        data,
        error,
      } = await query
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


    /* =====================================
       TODO DELETE
    ===================================== */

    if (
      action ===
      "deleteTodo"
    ) {
      let query =
        supabaseAdmin
          .from(
            "user_todos"
          )
          .delete()
          .eq(
            "id",
            body.id
          );

      query =
        scopeQuery(query);

      const {
        error,
      } = await query;

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
      "DATA POST:",
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