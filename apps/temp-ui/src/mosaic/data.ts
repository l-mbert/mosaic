import type { FolderItem, Message, Tab, TimelineItem } from "./types";

const me = { name: "Lambert Weller", email: "lambert@thekey.tech", initials: "LW" };
const p = (text: string) => ({ type: "paragraph" as const, spans: [{ text }] });

export const messages: Message[] = [
  {
    id: "m1",
    from: { name: "Dana Okafor", email: "dana@acme.com", initials: "DO" },
    to: [me, { name: "Priya Shah", email: "priya@thekey.tech", initials: "PS" }],
    subject: "Re: Renewal pricing for 2027",
    preview: "Thanks — the tiered option works. Can you send a revised quote?",
    time: "09:41",
    unread: true,
    threadCount: 6,
    bucket: "needs-you",
    deal: { account: "Acme Inc", stage: "Negotiation", value: "$84,000", closeDate: "31 Mar 2027" },
    body: [
      {
        type: "paragraph",
        spans: [
          {
            text: "Hi Lambert — thanks for walking us through the tiering yesterday. The three-tier option works for us, and finance is comfortable with the uplift as long as we lock the rate for ",
          },
          {
            text: "24 months",
            entity: {
              label: "Contract term · currently 12",
              action: "Set term",
              plugin: "deal-desk",
            },
          },
          { text: "." },
        ],
      },
      {
        type: "paragraph",
        spans: [
          {
            text: "Could you send a revised quote reflecting 140 seats instead of 120? I'd like to get it in front of our CFO before the board meeting on ",
          },
          {
            text: "the 28th",
            entity: { label: "Tue 28 Mar, 09:00", action: "Hold a slot", plugin: "calendar" },
          },
          { text: "." },
        ],
      },
      { type: "signoff", spans: [{ text: "Dana" }] },
    ],
    attachments: [
      {
        name: "Acme_Renewal_Quote_v2.pdf",
        size: "248 KB",
        conflict: {
          summary: "Quote is for 120 seats — the message asks for 140.",
          action: "Revise",
        },
      },
    ],
    quoted:
      "On Tue, 11 Aug at 16:20, Lambert Weller wrote:\n\nHi Dana — following up on the tiering conversation. I've attached a quote at the current seat count so finance has something concrete to react to.",
  },
  {
    id: "m2",
    from: { name: "Signatures", email: "no-reply@esign.com", initials: "SG" },
    to: [me],
    subject: "Northwind pilot agreement",
    preview: "A document is waiting for signature.",
    time: "08:20",
    unread: true,
    bucket: "needs-you",
    envelope: {
      signed: 2,
      total: 3,
      waitingOn: "legal@northwind.com",
      parties: [
        { name: "Lambert Weller", signed: true },
        { name: "Ana Ferreira", signed: true },
        { name: "Northwind Legal", signed: false },
      ],
    },
    // The real body is boilerplate. This is why readerReplace exists.
    body: [
      p("You have a document waiting for signature. Click the button below to review and sign."),
      p("This email was sent by an automated system. Do not reply."),
    ],
  },
  {
    id: "m3",
    from: { name: "Priya Shah", email: "priya@thekey.tech", initials: "PS" },
    to: [me],
    subject: "Vertex — technical deep dive",
    preview: "Invitation for Thursday afternoon.",
    time: "07:55",
    unread: true,
    bucket: "needs-you",
    invite: { when: "Thu 15:00", duration: "45 min", guests: 5 },
    body: [p("You have been invited to an event. Please respond using the buttons below.")],
  },
  {
    id: "m4",
    from: { name: "Marco Keller", email: "marco@northwind.com", initials: "MK" },
    to: [me],
    subject: "Procurement review — security questionnaire",
    preview: "Legal came back with questions on data residency and retention.",
    time: "07:02",
    unread: true,
    threadCount: 9,
    bucket: "needs-you",
    gist: "They need SOC 2 evidence by Friday to keep the close date.",
    body: [
      p(
        "Legal came back with a handful of questions on data residency and retention. Nothing alarming, but they want the SOC 2 report attached to the response.",
      ),
      { type: "signoff", spans: [{ text: "Marco" }] },
    ],
  },
  {
    id: "m5",
    from: { name: "Iberia", email: "no-reply@iberia.com", initials: "IB" },
    to: [me],
    subject: "Your booking is confirmed",
    preview: "Booking reference QK4T2M.",
    time: "Tue",
    unread: false,
    bucket: "everything",
    trip: { route: "Berlin → Lisbon", depart: "Fri 06:55", flight: "IB 3187", seat: "14A" },
    body: [
      p(
        "Thank you for booking with us. Your itinerary is below. Please arrive at the airport at least two hours before departure.",
      ),
      p("Manage your booking online to add baggage or select a different seat."),
    ],
  },
  {
    id: "m6",
    from: { name: "Tom Beckett", email: "tom@vertexlabs.io", initials: "TB" },
    to: [me],
    subject: "Intro to our platform lead",
    preview: "Happy to connect you with Ana next week.",
    time: "Tue",
    unread: false,
    bucket: "everything",
    // No plugin has anything to say about this one. This is the baseline.
    body: [
      p(
        "Happy to connect you with Ana next week — she owns the integration roadmap and will have opinions about the API surface.",
      ),
      { type: "signoff", spans: [{ text: "Tom" }] },
    ],
  },
  {
    id: "m7",
    from: { name: "Digest", email: "digest@mosaic.app", initials: "DG" },
    to: [me],
    subject: "Newsletters & notifications",
    preview: "22 messages bundled.",
    time: "Mon",
    unread: false,
    bucket: "everything",
    digest: {
      count: 22,
      items: [
        { source: "Stratechery", title: "The aggregation of enterprise software" },
        { source: "LinkedIn", title: "3 people viewed your profile" },
        { source: "Product Hunt", title: "Today's top 5 launches" },
        { source: "Figma", title: "Ana commented on Checkout v2" },
      ],
    },
    body: [p("This is your daily digest.")],
  },
];

export const timeline: TimelineItem[] = [
  {
    id: "t1",
    plugin: "deal-desk",
    title: "Stage moved to Negotiation",
    meta: "by you, after the pricing call",
    time: "6 days ago",
  },
  { id: "t2", plugin: "core", title: "Quote v2 sent", meta: "to Dana and finance", time: "11 Aug" },
  {
    id: "t3",
    plugin: "calendar",
    title: "Pricing walkthrough",
    meta: "45 min · Dana, Priya, you",
    time: "11 Aug",
  },
  {
    id: "t4",
    plugin: "esign",
    title: "Order form 2026 signed",
    meta: "previous term",
    time: "14 Mar 2026",
  },
];

export const initialTabs: Tab[] = [
  { id: "inbox", label: "Inbox", kind: "mailbox", plugin: "core", count: 4 },
  { id: "deal-acme", label: "Acme Inc · Renewal", kind: "canvas", plugin: "deal-desk" },
  { id: "newsletters", label: "Newsletters", kind: "canvas", plugin: "digest", count: 22 },
];

/** Everything Mosaic has stitched to the Acme renewal, whatever its source. */
export const dealFolderItems: FolderItem[] = [
  {
    id: "f1",
    plugin: "core",
    title: "Re: Renewal pricing for 2027",
    meta: "6 messages",
    who: "Dana Okafor",
    time: "09:41",
  },
  {
    id: "f2",
    plugin: "deal-desk",
    title: "Stage moved to Negotiation",
    meta: "after the pricing call",
    who: "You",
    time: "6 days ago",
  },
  {
    id: "f3",
    plugin: "core",
    title: "Quote v2 sent",
    meta: "120 seats",
    who: "You",
    time: "11 Aug",
  },
  {
    id: "f4",
    plugin: "calendar",
    title: "Pricing walkthrough",
    meta: "45 min",
    who: "Dana, Priya, you",
    time: "11 Aug",
  },
  {
    id: "f5",
    plugin: "core",
    title: "Security questionnaire",
    meta: "9 messages",
    who: "Marco Keller",
    time: "7 Aug",
  },
  {
    id: "f6",
    plugin: "esign",
    title: "Order form 2026 signed",
    meta: "previous term",
    who: "All parties",
    time: "14 Mar 2026",
  },
];
