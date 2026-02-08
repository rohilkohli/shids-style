import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type OrderStatusUpdateProps = {
  orderId: string;
  status: string;
  paymentVerified: boolean;
  awbNumber?: string;
  courierName?: string;
};

const statusLabel = (value: string) => value.replace(/_/g, " ");

const getStatusMessage = (status: string, paymentVerified: boolean) => {
  if (paymentVerified) {
    return {
      title: "Payment Verified!",
      message: "Your payment has been confirmed and your order is being prepared for shipment.",
    };
  }
  
  switch (status) {
    case "processing":
      return {
        title: "Order is Being Processed",
        message: "We're preparing your items and getting them ready for shipment.",
      };
    case "packed":
      return {
        title: "Order Packed",
        message: "Your order has been carefully packed and will be shipped soon.",
      };
    case "fulfilled":
      return {
        title: "Order Fulfilled",
        message: "Your order has been fulfilled and is ready to be handed over to the courier.",
      };
    case "shipped":
      return {
        title: "Order Shipped!",
        message: "Your order is on its way! You can track your shipment using the details below.",
      };
    case "cancelled":
      return {
        title: "Order Cancelled",
        message: "Your order has been cancelled. If this was a mistake, please contact us.",
      };
    default:
      return {
        title: "Order Update",
        message: "There's an update on your order status.",
      };
  }
};

export default function OrderStatusUpdate({
  orderId,
  status,
  paymentVerified,
  awbNumber,
  courierName,
}: OrderStatusUpdateProps) {
  const statusInfo = getStatusMessage(status, paymentVerified);
  const previewText = paymentVerified
    ? `Payment verified for order ${orderId}`
    : `Order ${orderId} status updated to ${statusLabel(status)}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>SHIDS STYLE</Heading>
            <Text style={styles.subtle}>Order update</Text>
          </Section>

          <Section style={styles.heroSection}>
            <Heading style={styles.statusTitle}>{statusInfo.title}</Heading>
            <Text style={styles.statusMessage}>{statusInfo.message}</Text>
          </Section>

          <Hr style={styles.hr} />

          <Section style={styles.section}>
            <Text style={styles.text}>Order ID</Text>
            <Text style={styles.value}>{orderId}</Text>
          </Section>

          <Section style={styles.section}>
            <Text style={styles.text}>Current status</Text>
            <Text style={styles.statusValue}>{statusLabel(status)}</Text>
          </Section>

          {paymentVerified && (
            <Section style={styles.section}>
              <Text style={styles.text}>Payment status</Text>
              <Text style={styles.verifiedValue}>✓ Verified</Text>
            </Section>
          )}

          {(awbNumber || courierName) && (
            <>
              <Hr style={styles.hr} />
              <Section style={styles.section}>
                <Text style={styles.sectionLabel}>Shipping Information</Text>
                <Text style={styles.shippingDetail}>
                  <strong>Courier:</strong> {courierName || "Pending"}
                </Text>
                <Text style={styles.shippingDetail}>
                  <strong>Tracking Number (AWB):</strong> {awbNumber || "Will be updated soon"}
                </Text>
              </Section>
            </>
          )}

          <Hr style={styles.hr} />

          <Section style={styles.ctaSection}>
            <Link href={`https://shidstyle.com/track?id=${orderId}`} style={styles.button}>
              Track Your Order
            </Link>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              We will keep you updated as your order progresses.
            </Text>
            <Text style={styles.footerText}>
              <strong>Questions?</strong> Email us at{" "}
              <Link href="mailto:wecare@shidstyle.com" style={styles.link}>
                wecare@shidstyle.com
              </Link>
            </Text>
            <Hr style={styles.footerHr} />
            <Text style={styles.subtle}>
              SHIDS STYLE · Modern Fashion E-commerce
            </Text>
            <Text style={styles.subtle}>Thanks for shopping with us!</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: "#f5f5f5",
    fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    margin: 0,
    padding: "32px 12px",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: "28px 28px 20px",
    maxWidth: 520,
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: 12,
  },
  brand: {
    fontSize: 24,
    margin: 0,
    color: "#111827",
    letterSpacing: "0.12em",
  },
  subtle: {
    color: "#6b7280",
    fontSize: 12,
    margin: "6px 0 0",
    textAlign: "center",
  },
  heroSection: {
    textAlign: "center",
    padding: "24px 0",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginTop: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px 0",
  },
  statusMessage: {
    fontSize: 14,
    lineHeight: "20px",
    color: "#6b7280",
    margin: "0 16px",
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: 6,
  },
  value: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
    textTransform: "capitalize",
  },
  verifiedValue: {
    fontSize: 14,
    fontWeight: 600,
    color: "#059669",
    margin: 0,
  },
  shippingDetail: {
    fontSize: 14,
    color: "#374151",
    lineHeight: "24px",
    margin: "4px 0",
  },
  hr: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: "18px 0",
  },
  ctaSection: {
    textAlign: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#111827",
    color: "#ffffff",
    padding: "12px 32px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    display: "inline-block",
    letterSpacing: "0.05em",
  },
  footer: {
    marginTop: 16,
    textAlign: "center",
  },
  footerText: {
    fontSize: 14,
    lineHeight: "20px",
    color: "#374151",
    margin: "4px 0",
    textAlign: "center",
  },
  footerHr: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: "16px 0",
  },
  link: {
    color: "#111827",
    textDecoration: "underline",
  },
};
