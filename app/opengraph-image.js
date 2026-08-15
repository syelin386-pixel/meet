import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "MEET";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",

          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",

          background: "#f5f5f3",
          color: "#171717",
        }}
      >
        <div
          style={{
            fontSize: 150,
            fontWeight: 900,
            letterSpacing: "-10px",
          }}
        >
          MEET
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 42,
            color: "#777777",
          }}
        >
          어디서 머할까?
        </div>

        <div
          style={{
            marginTop: 55,
            padding: "15px 30px",

            border: "2px solid #171717",
            borderRadius: 100,

            fontSize: 24,
          }}
        >
          우리 약속을 한 곳에서
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}