export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
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
          </div>
        </div>
      </section>
    </main>
  );
}
