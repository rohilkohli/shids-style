import Link from "next/link";
import Image from "next/image";

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex justify-center mb-6">
              <Image
                src="/Shids-logo.svg"
                alt="Shids Style"
                width={240}
                height={48}
                className="h-10 sm:h-12 w-auto max-w-[240px] object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Refund Policy</h1>
            <p className="text-sm text-gray-600">
              Refunds are initiated once returned items pass quality checks. Refunds are processed back to the original
              payment method within 5–7 business days.
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
              <li>Items must be unworn, unwashed, and in original packaging.</li>
              <li>Refunds exclude shipping fees unless the item is defective.</li>
              <li>Gift cards are non-refundable.</li>
            </ul>
            <p className="text-sm text-gray-600">For assistance, contact support@shids.style.</p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/returns-policy"
                className="inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold !text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Returns Policy
              </Link>
              <Link
                href="/contact"
                className="inline-flex rounded-full border border-gray-200 px-5 py-2.5 text-xs font-semibold text-gray-700 hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
