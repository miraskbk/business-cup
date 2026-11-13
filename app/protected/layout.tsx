import { Navbar } from "@/components/navbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-5xl flex-1 p-5">{children}</div>
    </main>
  );
}
