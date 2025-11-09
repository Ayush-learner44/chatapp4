import "./globals.css";

export const metadata = {
  title: "Chat App",
  description: "A simple chat application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
