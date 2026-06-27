import "./globals.css";
import SendioThemeController from "@/components/sendio/SendioThemeController";
import { CompanyProvider } from "@/context/CompanyContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SendioThemeController />
        <CompanyProvider>{children}</CompanyProvider>
      </body>
    </html>
  );
}