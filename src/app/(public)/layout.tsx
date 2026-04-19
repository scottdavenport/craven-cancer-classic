import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { StickyCTABar } from "@/components/public/sticky-cta-bar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      <Footer />
      <StickyCTABar />
    </>
  );
}
