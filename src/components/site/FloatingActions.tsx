import { MessageCircle, Phone } from "lucide-react";

export default function FloatingActions({ phone, whatsapp }: { phone: string; whatsapp: string }) {
  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col gap-3">
      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" data-track="whatsapp" className="relative grid size-13 place-items-center rounded-full bg-[#25D366] text-white shadow-xl sm:size-14" aria-label="WhatsApp">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[#25D366]" />
        <MessageCircle className="relative size-6" />
      </a>
      <a href={`tel:${phone}`} data-track="call" className="grid size-13 place-items-center rounded-full bg-brand-800 text-white shadow-xl sm:size-14" aria-label="Call">
        <Phone className="size-6" />
      </a>
    </div>
  );
}
