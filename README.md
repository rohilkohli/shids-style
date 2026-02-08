# SHIDS STYLE

A modern, full-featured fashion e-commerce platform built with Next.js 16, featuring a seamless shopping experience, order management, and email notifications.

## ✨ Features

- 🛍️ **Product Catalog**: Browse products with advanced filtering and search
- 🛒 **Shopping Cart**: Real-time cart management with persistent storage
- 💳 **Secure Checkout**: Complete order processing with payment verification
- 📧 **Email Notifications**: Automated order confirmations and status updates
- 📦 **Order Tracking**: Real-time order status tracking with AWB integration
- 👤 **User Authentication**: Secure login and registration via Supabase
- 🎫 **Discount Codes**: Support for percentage and fixed discount codes
- 📊 **Admin Dashboard**: Complete order and inventory management
- 🎨 **Modern UI**: Responsive design with Tailwind CSS
- ⚡ **Performance**: Optimized with Next.js 16 App Router and React Compiler

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Email Templates**: React Email

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email Service**: Resend
- **Analytics**: Vercel Analytics
- **Error Tracking**: Sentry

### Developer Tools
- **Language**: TypeScript
- **Linting**: ESLint
- **Compiler**: React Compiler (Babel)
- **Bundle Analysis**: Next.js Bundle Analyzer

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 20.x or higher
- **npm** or **yarn** package manager
- **Git** for version control

You'll also need accounts for:
- [Supabase](https://supabase.com) - Database and authentication
- [Resend](https://resend.com) - Email delivery service
- [Vercel](https://vercel.com) - Hosting (optional)
- [Sentry](https://sentry.io) - Error tracking (optional)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/rohilkohli/shids-style.git
cd shids-style
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key

# Sentry (Optional)
SENTRY_AUTH_TOKEN=your_sentry_auth_token
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Other Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the database migrations from the `supabase` folder
3. Set up the following tables:
   - `products` - Product catalog
   - `categories` - Product categories
   - `orders` - Customer orders
   - `order_items` - Order line items
   - `profiles` - User profiles
   - `discount_codes` - Promotional codes

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## 📦 Build and Deploy

### Production Build

```bash
npm run build
npm run start
```

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rohilkohli/shids-style)

1. Import your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with default Next.js settings

### Bundle Analysis

Analyze your bundle size:

```bash
npm run analyze
```

## 📁 Project Structure

```
shids-style/
├── public/              # Static assets
├── src/
│   ├── app/
│   │   ├── api/         # API routes
│   │   │   ├── auth/    # Authentication endpoints
│   │   │   ├── orders/  # Order management
│   │   │   ├── products/# Product catalog
│   │   │   └── ...
│   │   ├── components/  # React components
│   │   │   ├── emails/  # Email templates
│   │   │   └── ...
│   │   ├── lib/         # Utility functions
│   │   ├── admin/       # Admin dashboard
│   │   └── ...          # Page routes
│   └── proxy.ts         # Proxy configuration
├── supabase/            # Database migrations
├── .env.local           # Environment variables (create this)
└── package.json         # Dependencies

```

## 🔧 Configuration

### Email Templates

Email templates are located in `src/app/components/emails/`:
- `OrderReceipt.tsx` - Sent after order creation
- `OrderStatusUpdate.tsx` - Sent when order status changes

Customize the sender email in API routes:
```typescript
from: "SHIDS STYLE <wecare@shidstyle.com>"
```

### Discount Codes

Manage discount codes through the admin dashboard or API:
- Percentage discounts: `{ type: "percentage", value: 20 }`
- Fixed amount: `{ type: "fixed", value: 100 }`

## 🎯 Key Features

### Order Management
- Create orders with automatic stock management
- Real-time order status updates
- Payment verification tracking
- AWB (tracking number) integration
- Email notifications at each stage

### Admin Dashboard
Located at `/admin`:
- View and manage all orders
- Update order status and tracking info
- Verify payments
- Manage products and inventory
- Handle discount codes

### Email Notifications
Automated emails sent via Resend:
- Order confirmation with receipt
- Payment verification notice
- Order status updates (processing, packed, shipped)
- Shipping information with tracking details

## 🔐 Security

- Server-side authentication with Supabase
- Role-based access control (admin/customer)
- API route protection
- Environment variable validation
- Stock reservation system to prevent overselling

## 🧪 Development

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npx tsc --noEmit
```

## 📝 API Documentation

### Public Endpoints
- `GET /api/products` - List all products
- `GET /api/products/[id]` - Get product details
- `GET /api/categories` - List categories
- `POST /api/orders` - Create new order
- `GET /api/orders/track?id=[orderId]` - Track order

### Protected Endpoints (Require Authentication)
- `GET /api/orders` - List user's orders
- `GET /api/orders/[id]` - Get order details
- `PATCH /api/orders/[id]` - Update order (admin only)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Support

For support, email wecare@shidstyle.com or open an issue in the repository.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com)
- Email service by [Resend](https://resend.com)
- Icons by [Lucide](https://lucide.dev)

---

Made with ❤️ by SHIDS STYLE
