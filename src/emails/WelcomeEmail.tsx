import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const colors = {
  bg: "#FAF8F5",
  text: "#2C2C2C",
  soft: "#5C564E",
  accent: "#C4A265",
  accentDark: "#A8873F",
  line: "#E8E0D5",
};

export function WelcomeEmail({ firstName }: { firstName: string }) {
  const name = firstName?.trim() || "friend";

  return (
    <Html>
      <Head />
      <Preview>Welcome to 1128 — we’d love to see you Sunday.</Preview>
      <Body style={{ backgroundColor: colors.bg, margin: 0, fontFamily: 'DM Sans, -apple-system, Segoe UI, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
          <Text style={{ color: colors.accentDark, fontSize: 22, fontFamily: 'Georgia, serif', margin: 0 }}>
            1128
          </Text>
          <Heading style={{ color: colors.text, fontSize: 28, lineHeight: 1.2, fontWeight: 500, margin: "24px 0 12px", fontFamily: 'Georgia, serif' }}>
            {name}, we’re glad you’re here.
          </Heading>
          <Text style={{ color: colors.soft, fontSize: 16, lineHeight: 1.6 }}>
            Thanks for connecting with 1128. We’re a community of people learning to
            receive, remain, and reflect the love of God — and there’s a place for you.
          </Text>
          <Section style={{ margin: "28px 0", padding: "18px 20px", borderLeft: `3px solid ${colors.accent}`, backgroundColor: "#FFFFFF" }}>
            <Text style={{ margin: 0, color: colors.text, fontSize: 15, lineHeight: 1.55 }}>
              <strong>Join us Sunday</strong>
              <br />
              11:45 AM · 1601 W La Habra Blvd, La Habra, CA 90631
            </Text>
          </Section>
          <Link
            href="https://maps.google.com/?q=1601+W+La+Habra+Blvd,+La+Habra,+CA+90631"
            style={{
              display: "inline-block",
              backgroundColor: colors.accent,
              color: "#fff",
              textDecoration: "none",
              padding: "12px 18px",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Get directions
          </Link>
          <Text style={{ color: colors.soft, fontSize: 14, lineHeight: 1.6, marginTop: 28 }}>
            Someone from our team may reach out soon. If you have a question in the meantime, just reply to this email.
          </Text>
          <Text style={{ color: "#9A9288", fontSize: 12, marginTop: 36, borderTop: `1px solid ${colors.line}`, paddingTop: 16 }}>
            1128 Church · La Habra, CA
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
