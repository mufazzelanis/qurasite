import Image from "next/image";
import LoginForm from "./LoginForm";

export const metadata = { title: "Admin Login", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-900 p-4">
      <div className="absolute -left-40 -top-40 size-[600px] animate-blob bg-brand-600/40 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 size-[600px] animate-blob bg-gold-500/25 blur-3xl [animation-delay:-6s]" />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <Image src="/brand/logo-en-t.png" alt="Qura Food" width={220} height={80} className="mx-auto mb-2 h-16 w-auto" />
        <p className="mb-8 text-center text-sm text-zinc-500">Admin Dashboard</p>
        <LoginForm />
      </div>
    </div>
  );
}
