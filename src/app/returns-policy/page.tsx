import Link from "next/link";
import Image from "next/image";
import { Breadcrumbs, breadcrumbConfigs } from "../components/Breadcrumbs";

export default function ReturnsPolicyPage() {
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbConfigs.returnsPolicy} className="mb-6" />
          <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex justify-center">
              <Image
                src="/typographic-logo-shids.svg"
                alt="Shids Style"
                width={220}
                height={36}
                className="h-8 w-auto max-w-[220px] object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Returns Policy</h1>
            <p className="text-sm text-gray-600">
              Returns are accepted within 7 days of delivery. Initiate a return by contacting support@shids.style with
              your order ID.
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
              <li>Items must be in original condition with tags intact.</li>
              <li>Clearance items are not eligible for returns.</li>
              <li>Return pickup availability depends on location.</li>
            </ul>
            <p className="text-sm text-gray-600">We recommend using a traceable courier if self-shipping.</p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/refund-policy"
                className="inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold !text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Refund Policy
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
