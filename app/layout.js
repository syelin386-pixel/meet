import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://meet-syelin386-pixel.vercel.app"),

  title: "MEET",

  description: "어디서 머할까?",

  openGraph: {
    title: "MEET",
    description: "어디서 머할까?",
    type: "website",
    siteName: "MEET",

    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MEET",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "MEET",
    description: "어디서 머할까?",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}