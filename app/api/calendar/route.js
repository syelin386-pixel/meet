import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const cookieStore =
      await cookies();

    const accessToken =
      cookieStore.get(
        "meet_kakao_access_token"
      )?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "카카오 로그인이 필요해요.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const {
      title,
      date,
      startTime,
      endTime,
      place,
      plan,
    } = body;

    if (
      !title ||
      !date ||
      !startTime
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "제목, 날짜, 시작 시간이 필요해요.",
        },
        {
          status: 400,
        }
      );
    }

    const start =
      new Date(
        `${date}T${startTime}:00+09:00`
      );

    let end;

    if (endTime) {
      end = new Date(
        `${date}T${endTime}:00+09:00`
      );
    } else {
      end = new Date(
        start.getTime() +
          2 * 60 * 60 * 1000
      );
    }

    if (end <= start) {
      return NextResponse.json(
        {
          success: false,
          message:
            "끝나는 시간은 시작 시간보다 뒤여야 해요.",
        },
        {
          status: 400,
        }
      );
    }

    const event = {
      title,

      time: {
        start_at:
          start.toISOString(),

        end_at:
          end.toISOString(),

        time_zone:
          "Asia/Seoul",

        all_day: false,

        lunar: false,
      },

      description:
        plan || "",

      location:
        place
          ? {
              name: place,
            }
          : undefined,
    };

    const form =
      new URLSearchParams();

    form.set(
      "calendar_id",
      "primary"
    );

    form.set(
      "event",
      JSON.stringify(event)
    );

    const kakaoResponse =
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

          body: form.toString(),

          cache: "no-store",
        }
      );

    const result =
      await kakaoResponse.json();

    if (!kakaoResponse.ok) {
      console.error(
        "Calendar error:",
        result
      );

      return NextResponse.json(
        {
          success: false,
          error: result,
        },
        {
          status:
            kakaoResponse.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      eventId:
        result.event_id,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}