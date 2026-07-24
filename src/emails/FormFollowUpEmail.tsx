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
import { brand } from "@/lib/brand";
import type { FormEmail } from "@/lib/forms/schema";

type Props = {
  email: FormEmail;
  subjectVars: Record<string, string>;
};

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * One branded email shell for every form. Copy comes from FormDefinition.email.
 */
export function FormFollowUpEmail({ email, subjectVars }: Props) {
  const c = brand.colors;
  const heading = fill(email.heading, subjectVars);
  const paragraphs = email.body.map((p) => fill(p, subjectVars));
  const preview = fill(email.preview ?? email.subject, subjectVars);
  const footer = email.footer ?? `${brand.legalName} · La Habra, CA`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: c.bg,
          margin: 0,
          fontFamily: "DM Sans, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <Container
          style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}
        >
          <Text
            style={{
              color: c.accentDark,
              fontSize: 22,
              fontFamily: "Georgia, serif",
              margin: 0,
            }}
          >
            {brand.name}
          </Text>
          <Heading
            style={{
              color: c.text,
              fontSize: 28,
              lineHeight: 1.2,
              fontWeight: 500,
              margin: "24px 0 12px",
              fontFamily: "Georgia, serif",
            }}
          >
            {heading}
          </Heading>
          {paragraphs.map((paragraph) => (
            <Text
              key={paragraph.slice(0, 24)}
              style={{ color: c.soft, fontSize: 16, lineHeight: 1.6 }}
            >
              {paragraph}
            </Text>
          ))}

          {(email.ctaHref && email.ctaLabel) || brand.service.when ? (
            <Section
              style={{
                margin: "28px 0",
                padding: "18px 20px",
                borderLeft: `3px solid ${c.accent}`,
                backgroundColor: "#FFFFFF",
              }}
            >
              <Text
                style={{
                  margin: 0,
                  color: c.text,
                  fontSize: 15,
                  lineHeight: 1.55,
                }}
              >
                <strong>Join us Sunday</strong>
                <br />
                {brand.service.when} · {brand.service.where}
              </Text>
            </Section>
          ) : null}

          {email.ctaHref && email.ctaLabel ? (
            <Link
              href={email.ctaHref}
              style={{
                display: "inline-block",
                backgroundColor: c.accent,
                color: "#fff",
                textDecoration: "none",
                padding: "12px 18px",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {email.ctaLabel}
            </Link>
          ) : null}

          <Text
            style={{
              color: "#9A9288",
              fontSize: 12,
              marginTop: 36,
              borderTop: `1px solid ${c.line}`,
              paddingTop: 16,
            }}
          >
            {footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default FormFollowUpEmail;
