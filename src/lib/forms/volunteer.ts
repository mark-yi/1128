import { brand } from "@/lib/brand";
import { volunteerAreaOptions } from "@/lib/teams";
import type { FormDefinition } from "./schema";

export const volunteerForm: FormDefinition = {
  schemaVersion: 1,
  version: 4,
  slug: "volunteer",
  title: "Serve with us",
  description:
    "After Pathway — tell us where you’d love to help. Your team lead will place you and you’ll become a member.",
  active: true,
  pco: {
    source: "Website — Volunteer Form",
    stage: "Volunteer Interest",
    includeAnswers: true,
  },
  success: {
    title: "You’re on the list",
    body: "Your team lead will review, place you on a team, and get you plugged in.",
    secondary: `${brand.service.when} · La Habra`,
    ctaLabel: "Back to 1128",
    ctaHref: brand.siteUrl,
    personalizeWithName: true,
  },
  email: {
    subject: "Thanks for offering to serve at 1128",
    preview: "Thanks for offering to serve at 1128.",
    heading: "Thank you, {{firstName}}.",
    body: [
      "We’re grateful you want to serve with us. Your team lead will follow up soon — once you’re placed on a team, you’re a member.",
      "Until then — come worship with us Sunday at 11:45 AM.",
    ],
    ctaLabel: "Visit 1128",
    ctaHref: brand.siteUrl,
    footer: `${brand.legalName} · La Habra, CA`,
  },
  steps: [
    {
      id: "welcome",
      type: "statement",
      title: "Serve with 1128",
      body: "For people who’ve completed Pathway. We’ll look you up in Planning Center, then connect you with a team.",
    },
    {
      id: "email",
      type: "email",
      role: "email",
      title: "What’s your email?",
      help: "Use the email we already have on file.",
      placeholder: "name@email.com",
      required: true,
    },
    {
      id: "first_name",
      type: "name",
      role: "first_name",
      title: "First name?",
      placeholder: "Type your answer here…",
      required: true,
    },
    {
      id: "last_name",
      type: "name",
      role: "last_name",
      title: "Last name?",
      placeholder: "Type your answer here…",
      required: true,
    },
    {
      id: "phone",
      type: "phone",
      role: "phone",
      title: "Phone?",
      placeholder: "(555) 555-5555",
      required: false,
    },
    {
      id: "areas",
      type: "multi_choice",
      title: "Where would you like to serve?",
      help: "Pick as many as you want.",
      required: true,
      options: volunteerAreaOptions(),
    },
    {
      id: "experience",
      type: "yes_no",
      title: "Have you served on a church team before?",
      required: true,
      autoAdvance: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "Not yet" },
      ],
    },
    {
      id: "availability",
      type: "single_choice",
      title: "When are you usually available?",
      required: true,
      autoAdvance: true,
      options: [
        { value: "sunday_am", label: "Sunday mornings" },
        { value: "weekday", label: "Weekdays" },
        { value: "flexible", label: "Pretty flexible" },
      ],
    },
    {
      id: "notes",
      type: "long_text",
      role: "notes",
      title: "Anything else we should know?",
      help: "Gifts, experience, questions — optional.",
      placeholder: "Type here…",
      required: false,
    },
  ],
};
