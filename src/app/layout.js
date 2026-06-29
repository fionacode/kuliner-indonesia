

import "./globals.css";

export const metadata = {
  title: "Jelajah Kuliner Nusantara",
  description: "Game papan petualangan kuliner Nusantara yang seru, edukatif, dan penuh tantangan rasa!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
