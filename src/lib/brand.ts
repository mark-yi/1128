export const brand = {
  name: "1128",
  legalName: "1128 Church",
  tagline: "Come to Me, all who are weary",
  siteUrl: "https://www.1128church.org/",
  email: "info@1128ministry.org",
  service: {
    when: "Sundays · 11:45 AM",
    where: "1601 W La Habra Blvd, La Habra, CA 90631",
    mapsUrl:
      "https://maps.google.com/?q=1601+W+La+Habra+Blvd,+La+Habra,+CA+90631",
  },
  colors: {
    bg: "#FAF8F5",
    text: "#2C2C2C",
    soft: "#5C564E",
    accent: "#C4A265",
    accentDark: "#A8873F",
    line: "#E8E0D5",
  },
} as const;

export type Brand = typeof brand;
