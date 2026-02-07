import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div id="policies" className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
          <div>
            <h3 className="font-medium mb-4">Help Customers</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li>support@shids.style</li>
              <li>Mon–Sat · 10am–6pm</li>
              <li className="flex gap-3">
                <a
                  href="https://www.instagram.com/shids.style?igsh=MXUydTRpNmdweXdoaQ%3D%3D"
                  className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
                >
                  Instagram
                </a>
                <a
                  href="https://www.facebook.com/people/Shidsstyle/61586509945395/"
                  className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <Link href="/terms" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/policy" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/returns-policy" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Returns Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4">Important Links</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <Link href="/track" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/recently-viewed" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Recently Viewed
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Wishlist
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Account
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4">About</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <Link href="/about" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded">
                  Our Story
                </Link>
              </li>
              <li>Designed in India</li>
              <li>Seasonal drops, limited runs</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-white/15 text-center text-xs sm:text-sm text-white">
          © 2026 SHIDS STYLE. All rights reserved. Made by Mr. Kohli with ❤️
        </div>
      </div>
    </footer>
  );
}
