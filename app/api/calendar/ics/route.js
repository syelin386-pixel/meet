import crypto from "node:crypto";

import { getCurrentUser } from "../../../../lib/auth";

function escapeIcs(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toUtcIcs(date, time) {
  const source =
    `${date}T${time || "00:00"}:00+09:00`;

  const d = new Date(source);

  const pad = (n) =>
    String(n).padStart(2, "0");

  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export async function POST(request) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return new Response(
        "로그인이 필요합니다.",
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const title =
      String(
        body.title || ""
      ).trim();

    const date =
      String(
        body.date || ""
      );

    const startTime =
      String(
        body.startTime || ""
      );

    let endTime =
      String(
        body.endTime || ""
      );

    const place =
      String(
        body.place || ""
      );

    const plan =
      String(
        body.plan || ""
      );

    if (
      !title ||
      !date ||
      !startTime
    ) {
      return new Response(
        "제목, 날짜, 시작 시간이 필요합니다.",
        {
          status: 400,
        }
      );
    }

    if (!endTime) {
      const start =
        new Date(
          `${date}T${startTime}:00+09:00`
        );

      const end =
        new Date(
          start.getTime() +
            2 *
              60 *
              60 *
              1000
        );

      const formatter =
        new Intl.DateTimeFormat(
          "en-GB",
          {
            timeZone:
              "Asia/Seoul",

            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        );

      endTime =
        formatter.format(end);
    }

    const uid =
      `${crypto.randomUUID()}@meet`;

    const now =
      new Date();

    const pad = (n) =>
      String(n).padStart(2, "0");

    const dtstamp =
      now.getUTCFullYear() +
      pad(
        now.getUTCMonth() + 1
      ) +
      pad(now.getUTCDate()) +
      "T" +
      pad(now.getUTCHours()) +
      pad(now.getUTCMinutes()) +
      pad(now.getUTCSeconds()) +
      "Z";

    const dtstart =
      toUtcIcs(
        date,
        startTime
      );

    const dtend =
      toUtcIcs(
        date,
        endTime
      );

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MEET//Calendar//KO",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",

      "BEGIN:VEVENT",

      `UID:${uid}`,

      `DTSTAMP:${dtstamp}`,

      `DTSTART:${dtstart}`,

      `DTEND:${dtend}`,

      `SUMMARY:${escapeIcs(title)}`,

      place
        ? `LOCATION:${escapeIcs(place)}`
        : null,

      plan
        ? `DESCRIPTION:${escapeIcs(plan)}`
        : null,

      "END:VEVENT",

      "END:VCALENDAR",
    ].filter(Boolean);

    const ics =
      lines.join("\r\n");

    const safeFilename =
      title
        .replace(
          /[^a-zA-Z0-9가-힣_-]/g,
          "_"
        )
        .slice(0, 40);

    return new Response(ics, {
      status: 200,

      headers: {
        "Content-Type":
          "text/calendar; charset=utf-8",

        "Content-Disposition":
          `attachment; filename*=UTF-8''${encodeURIComponent(
            `${safeFilename || "meet"}.ics`
          )}`,

        "Cache-Control":
          "no-store",
      },
    });
  } catch (error) {
    console.error(
      "ICS error:",
      error
    );

    return new Response(
      "캘린더 파일 생성에 실패했습니다.",
      {
        status: 500,
      }
    );
  }
}