export default function ShippingPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipping Policy</h1>
            <p className="text-sm text-gray-600">
              Orders are processed within 1–2 business days. Delivery timelines vary by location and will be shown at
              checkout.
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
              <li>Standard shipping: 3–7 business days.</li>
              <li>Express shipping: 1–3 business days (where available).</li>
              <li>Tracking details are shared via email once your order ships.</li>
            </ul>
            <p className="text-sm text-gray-600">
              For delays caused by natural events or courier disruptions, our support team will assist with updates.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
