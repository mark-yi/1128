import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
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

export function VolunteerThanksEmail({ firstName }: { firstName: string }) {
  const name = firstName?.trim() || "friend";

  return (
    <Html>
      <Head />
      <Preview>Thanks for offering to serve at 1128.</Preview>
      <Body style={{ backgroundColor: colors.bg, margin: 0, fontFamily: 'DM Sans, -apple-system, Segoe UI, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
          <Text style={{ color: colors.accentDark, fontSize: 22, fontFamily: 'Georgia, serif', margin: 0 }}>
            1128
          </Text>
          <Heading style={{ color: colors.text, fontSize: 28, lineHeight: 1.2, fontWeight: 500, margin: "24px 0 12px", fontFamily: 'Georgia, serif' }}>
            Thank you, {name}.
          </Heading>
          <Text style={{ color: colors.soft, fontSize: 16, lineHeight: 1.6 }}>
            We’re grateful you want to serve with us. A ministry lead will follow up
            soon with next steps and how to get plugged in.
          </Text>
          <Text style={{ color: colors.soft, fontSize: 16, lineHeight: 1.6 }}>
            Until then — come worship with us Sunday at 11:45 AM.
          </Text>
          <Link
            href="https://www.1128church.org/"
            style={{
              display: "inline-block",
              backgroundColor: colors.accent,
              color: "#fff",
              textDecoration: "none",
              padding: "12px 18px",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              marginTop: 8,
            }}
          >
            Visit 1128
          </Link>
          <Text style={{ color: "#9A9288", fontSize: 12, marginTop: 36, borderTop: `1px solid ${colors.line}`, paddingTop: 16 }}>
            1128 Church · La Habra, CA
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default VolunteerThanksEmail;
