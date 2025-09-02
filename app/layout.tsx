export const metadata = { title: "Viamanta – Fleet Builder" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
