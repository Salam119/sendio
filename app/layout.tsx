import "./globals.css";
import SendioThemeController from "@/components/sendio/SendioThemeController";
import GlobalMessageAlert from "@/components/GlobalMessageAlert";
import GlobalAccountNotice from "@/components/GlobalAccountNotice";
import { CompanyProvider } from "@/context/CompanyContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SendioThemeController />
        <CompanyProvider>
          {children}
          <GlobalMessageAlert />
          <GlobalAccountNotice />

          <Analytics />
          <SpeedInsights />
        </CompanyProvider>
      </body>
    </html>
  );
}