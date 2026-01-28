export default function ReturnsPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
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
          </div>
        </div>
      </section>
    </main>
  );
}
