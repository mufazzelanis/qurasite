import type { Metadata } from "next";
import { Suspense } from "react";
import TrackOrder from "@/components/site/TrackOrder";

export const metadata: Metadata = { title: "অর্ডার ট্র্যাক করুন" };

export default function TrackPage() {
  return (
    <section className="container-x max-w-3xl py-14">
      <div className="mb-10 text-center">
        <span className="eyebrow">লাইভ অর্ডার ট্র্যাকিং</span>
        <h1 className="section-title mt-4">আপনার অর্ডার <span className="text-gradient">কোথায়?</span></h1>
        <p className="mt-3 text-brand-900/60">মোবাইল নাম্বার অথবা অর্ডার নম্বর দিয়ে খুঁজুন</p>
      </div>
      <Suspense>
        <TrackOrder />
      </Suspense>
    </section>
  );
}
