import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getOpeningHours, getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);
  return (
    <>
      <Header />
      {settings.announcement ? (
        <div role="status" className="fixed inset-x-0 top-16 z-30 bg-maroon px-4 py-2 text-center text-sm text-[#f6e7cf] lg:top-[4.5rem]">
          {settings.announcement}
        </div>
      ) : null}
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer settings={settings} hours={hours} />
    </>
  );
}
