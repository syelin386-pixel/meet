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
      content,
      dueDate,
    } = body;

    if (!content) {
      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 400,
        }
      );
    }

    const task = {
      content,
    };

    if (dueDate) {
      task.due_info = {
        due_date:
          dueDate.replaceAll(
            "-",
            ""
          ),

        time_zone:
          "Asia/Seoul",
      };
    }

    const form =
      new URLSearchParams();

    form.set(
      "task",
      JSON.stringify(task)
    );

    const kakaoResponse =
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

          body: form.toString(),

          cache: "no-store",
        }
      );

    const result =
      await kakaoResponse.json();

    if (!kakaoResponse.ok) {
      console.error(
        "Task error:",
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
      taskId:
        result.task_id,
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