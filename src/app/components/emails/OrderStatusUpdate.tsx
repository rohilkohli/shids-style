import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
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

export default function OrderStatusUpdate({
  orderId,
  status,
  paymentVerified,
  awbNumber,
  courierName,
}: OrderStatusUpdateProps) {
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

          <Section style={styles.section}>
            <Text style={styles.text}>Order ID</Text>
            <Text style={styles.value}>{orderId}</Text>
          </Section>

          <Section style={styles.section}>
            <Text style={styles.text}>Current status</Text>
            <Text style={styles.value}>{statusLabel(status)}</Text>
          </Section>

          {paymentVerified && (
            <Section style={styles.section}>
              <Text style={styles.text}>Payment status</Text>
              <Text style={styles.value}>Verified</Text>
            </Section>
          )}

          {(awbNumber || courierName) && (
            <Section style={styles.section}>
              <Text style={styles.text}>Shipping details</Text>
              <Text style={styles.value}>Courier: {courierName || "Pending"}</Text>
              <Text style={styles.value}>AWB: {awbNumber || "Pending"}</Text>
            </Section>
          )}

          <Hr style={styles.hr} />

          <Section style={styles.footer}>
            <Text style={styles.text}>
              We will keep you updated as your order progresses.
            </Text>
            <Text style={styles.subtle}>Thanks for shopping with SHIDS STYLE.</Text>
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
  },
  section: {
    marginTop: 16,
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
  hr: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: "18px 0",
  },
  footer: {
    marginTop: 16,
    textAlign: "center",
  },
};
