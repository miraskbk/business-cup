import { Navbar } from "@/components/navbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-[1360px] flex-1 px-6 py-8 lg:px-10 lg:py-10">
        {children}
      </div>
    </main>
  );
}
