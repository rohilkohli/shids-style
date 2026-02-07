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

export type OrderReceiptItem = {
  name: string;
  qty: number;
  price: number;
};

export type OrderReceiptProps = {
  orderId: string;
  customerName: string;
  items: OrderReceiptItem[];
  total: number;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

export default function OrderReceipt({ orderId, customerName, items, total }: OrderReceiptProps) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for your order at SHIDS STYLE.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>SHIDS STYLE</Heading>
            <Text style={styles.subtle}>Thank you for your order</Text>
          </Section>

          <Section style={styles.section}>
            <Text style={styles.greeting}>Hi {customerName || "there"},</Text>
            <Text style={styles.text}>
              We’ve received your order and will start processing it right away. Here is your receipt:
            </Text>
          </Section>

          <Section style={styles.section}>
            <Text style={styles.label}>Order ID</Text>
            <Text style={styles.value}>{orderId}</Text>
          </Section>

          <Hr style={styles.hr} />

          <Section style={styles.section}>
            <Text style={styles.label}>Order Summary</Text>
            {items.map((item, index) => (
              <Section key={`${item.name}-${index}`} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>Qty: {item.qty}</Text>
                <Text style={styles.itemPrice}>{currency(item.price * item.qty)}</Text>
              </Section>
            ))}
            <Hr style={styles.hr} />
            <Section style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{currency(total)}</Text>
            </Section>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.text}>If you have any questions, reply to this email and we’ll help you out.</Text>
            <Text style={styles.subtle}>SHIDS STYLE · Thank you for shopping with us.</Text>
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
  greeting: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
  },
  text: {
    fontSize: 14,
    lineHeight: "20px",
    color: "#374151",
    margin: "8px 0 0",
  },
  label: {
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
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
  },
  itemName: {
    fontSize: 14,
    color: "#111827",
    margin: 0,
    flex: 1,
  },
  itemMeta: {
    fontSize: 12,
    color: "#6b7280",
    margin: 0,
    width: 80,
    textAlign: "center",
  },
  itemPrice: {
    fontSize: 14,
    color: "#111827",
    margin: 0,
    width: 100,
    textAlign: "right",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
  },
};
