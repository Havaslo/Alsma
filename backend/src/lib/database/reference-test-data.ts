import type { Prisma } from "../../generated/prisma/client.js";

const testId = (suffix: string) =>
  `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

const referenceGuestIds = {
  alex: testId("101"),
  jamie: testId("102"),
  taylor: testId("103"),
} as const;

export const referenceGuestUsers = [
  {
    email: "alex.morgan@example.com",
    fullName: "Alex Morgan",
    id: referenceGuestIds.alex,
    phone: "+70000000101",
  },
  {
    email: "jamie.lee@example.com",
    fullName: "Jamie Lee",
    id: referenceGuestIds.jamie,
    phone: "+70000000102",
  },
  {
    email: "taylor.kim@example.com",
    fullName: "Taylor Kim",
    id: referenceGuestIds.taylor,
    phone: "+70000000103",
  },
] satisfies Prisma.GuestUserCreateManyInput[];

export const referenceGuestBonusPrograms = referenceGuestUsers.map(
  (guest, index) => ({
    balance: [1_250, 640, 2_100][index],
    id: testId(`${201 + index}`),
    level: ["Gold", "Silver", "Gold"][index],
    userId: guest.id,
  }),
) satisfies Prisma.GuestBonusProgramCreateManyInput[];

export const referenceGuestBookings = [
  {
    checkInDate: new Date("2026-08-14T00:00:00.000Z"),
    checkOutDate: new Date("2026-08-17T00:00:00.000Z"),
    guestsCount: 2,
    id: testId("301"),
    roomName: "Forest Studio",
    status: "confirmed",
    totalAmount: "54000.00",
    userId: referenceGuestIds.alex,
  },
  {
    checkInDate: new Date("2026-09-04T00:00:00.000Z"),
    checkOutDate: new Date("2026-09-07T00:00:00.000Z"),
    guestsCount: 4,
    id: testId("302"),
    roomName: "Family Suite",
    status: "confirmed",
    totalAmount: "93000.00",
    userId: referenceGuestIds.jamie,
  },
  {
    checkInDate: new Date("2026-05-22T00:00:00.000Z"),
    checkOutDate: new Date("2026-05-25T00:00:00.000Z"),
    guestsCount: 2,
    id: testId("303"),
    roomName: "Riverside Cottage",
    status: "completed",
    totalAmount: "81000.00",
    userId: referenceGuestIds.taylor,
  },
] satisfies Prisma.GuestBookingCreateManyInput[];

export const referenceSiteLeads = [
  {
    details: {
      checkInDate: "2026-08-14",
      checkOutDate: "2026-08-17",
      comment: "Interested in a quiet room and a wellness program.",
      guestsCount: 2,
    },
    email: "lead.home@example.com",
    formCode: "home-booking-widget",
    formTitle: "Homepage booking request",
    id: testId("401"),
    name: "Homepage Test Guest",
    phone: "+70000000401",
    sourcePage: "home",
    status: "new",
  },
  {
    details: {
      comment: "Please suggest a transfer from the railway station.",
      preferredDate: "2026-08-14",
      preferredTime: "12:30",
    },
    email: "lead.transfer@example.com",
    formCode: "about-transfer",
    formTitle: "Transfer request",
    id: testId("402"),
    name: "Transfer Test Guest",
    phone: "+70000000402",
    sourcePage: "about",
    status: "processing",
  },
  {
    details: {
      comment: "Need accommodation and a meeting room for twelve guests.",
      guestsCount: 12,
    },
    email: "lead.corporate@example.com",
    formCode: "celebrations-corporate",
    formTitle: "Corporate stay request",
    id: testId("403"),
    name: "Corporate Test Guest",
    phone: "+70000000403",
    sourcePage: "celebrations",
    status: "new",
  },
] satisfies Prisma.SiteLeadCreateManyInput[];

export const referenceBookingRequests = [
  {
    amount: "54000.00",
    checkInDate: new Date("2026-08-14T00:00:00.000Z"),
    checkOutDate: new Date("2026-08-17T00:00:00.000Z"),
    email: "booking.one@example.com",
    guestName: "Booking Test One",
    guestsCount: 2,
    id: testId("501"),
    phone: "+70000000501",
    roomName: "Forest Studio",
    status: "processing",
  },
  {
    amount: "93000.00",
    checkInDate: new Date("2026-09-04T00:00:00.000Z"),
    checkOutDate: new Date("2026-09-07T00:00:00.000Z"),
    email: "booking.two@example.com",
    guestName: "Booking Test Two",
    guestsCount: 4,
    id: testId("502"),
    phone: "+70000000502",
    roomName: "Family Suite",
    status: "new",
  },
  {
    amount: "81000.00",
    checkInDate: new Date("2026-05-22T00:00:00.000Z"),
    checkOutDate: new Date("2026-05-25T00:00:00.000Z"),
    email: "booking.paid@example.com",
    guestName: "Paid Booking Test",
    guestsCount: 2,
    id: testId("503"),
    paidAt: new Date("2026-05-10T10:00:00.000Z"),
    phone: "+70000000503",
    roomName: "Riverside Cottage",
    status: "completed",
  },
] satisfies Prisma.BookingRequestCreateManyInput[];

export const referenceAdminRequests = [
  {
    category: "Weekend booking",
    contact: "+70000000601",
    description: "Prepare a two-night quote with SPA access and late checkout.",
    details: {
      adultsCount: 2,
      channelType: "call",
      checkInDate: "2026-08-14",
      checkOutDate: "2026-08-17",
      source: "Phone",
    },
    id: testId("601"),
    requester: "Request Test One",
    status: "processing",
    title: "Booking",
  },
  {
    category: "Wellness consultation",
    contact: "+70000000602",
    description:
      "Confirm the program contents and available appointment slots.",
    details: {
      channelType: "chat",
      managerName: "Wellness team",
      source: "Website",
    },
    id: testId("602"),
    requester: "Request Test Two",
    status: "new",
    title: "Consultation",
  },
  {
    category: "Corporate stay",
    contact: "+70000000603",
    description: "A manager needs to confirm accommodation and event spaces.",
    details: {
      adultsCount: 12,
      channelType: "chat",
      source: "Telegram",
    },
    id: testId("603"),
    requester: "Request Test Three",
    status: "completed",
    title: "Manager transfer",
  },
] satisfies Prisma.AdminRequestCreateManyInput[];

export const referenceManagerTasks = [
  {
    description: "Call back with a quote for two adults and two children.",
    id: testId("701"),
    priority: "urgent",
    status: "pending",
    title: "Follow up on the family weekend request",
  },
  {
    description: "Verify the cancellation and prepayment refund conditions.",
    id: testId("702"),
    priority: "high",
    status: "pending",
    title: "Check the prepayment refund conditions",
  },
  {
    completedAt: new Date("2026-07-20T11:30:00.000Z"),
    description: "Confirm the railway station pickup time with the guest.",
    id: testId("703"),
    priority: "normal",
    status: "completed",
    title: "Confirm the guest transfer",
  },
] satisfies Prisma.ManagerTaskCreateManyInput[];

export const referenceKnowledgeArticles = [
  {
    content:
      "Guests may stay with a small pet after confirming the room category and paying the applicable cleaning fee.",
    id: testId("801"),
    publishedAt: new Date("2026-07-01T09:00:00.000Z"),
    status: "published",
    title: "Staying with pets",
  },
  {
    content:
      "Bookings can be paid by bank card or bank transfer. A manager must verify refunds and partial prepayments.",
    id: testId("802"),
    publishedAt: new Date("2026-07-01T09:00:00.000Z"),
    status: "published",
    title: "Payment options",
  },
] satisfies Prisma.KnowledgeArticleCreateManyInput[];

export const referenceKnowledgeChunks = referenceKnowledgeArticles.map(
  (article, index) => ({
    articleId: article.id,
    chunkIndex: 0,
    content: article.content,
    id: testId(`${811 + index}`),
  }),
) satisfies Prisma.KnowledgeChunkCreateManyInput[];

export const referenceAgentRules = [
  {
    content:
      "Answer only with facts available in the published knowledge base.",
    enabled: true,
    id: testId("901"),
    priority: 100,
    title: "Use verified knowledge",
  },
  {
    content: "Do not promise room availability before it has been checked.",
    enabled: true,
    id: testId("902"),
    priority: 90,
    title: "Do not invent availability",
  },
  {
    content: "Keep voice responses concise and offer a manager when uncertain.",
    enabled: true,
    id: testId("903"),
    priority: 80,
    title: "Keep voice responses concise",
  },
] satisfies Prisma.AgentRuleCreateManyInput[];

export const referenceAgentScenarios = [
  {
    enabled: true,
    id: testId("1001"),
    response:
      "Greet the guest, identify the requested type of stay, and suggest one or two relevant options.",
    title: "Initial consultation",
    trigger: "consultation",
  },
  {
    enabled: true,
    id: testId("1002"),
    response:
      "Collect dates, guest count, room preferences, and important requirements, then summarize the request.",
    title: "Booking details",
    trigger: "booking",
  },
  {
    enabled: true,
    id: testId("1003"),
    response:
      "Explain that the information needs verification and offer a manager callback.",
    title: "Fallback response",
    trigger: "low-confidence",
  },
] satisfies Prisma.AgentScenarioCreateManyInput[];

export const referenceTransferRules = [
  {
    condition:
      "The request concerns a group stay, corporate event, or non-standard accommodation.",
    destination: "booking-manager",
    enabled: true,
    id: testId("1101"),
    title: "Transfer complex bookings",
  },
  {
    condition:
      "The answer cannot be verified from rates, service rules, or availability data.",
    destination: "manager-callback",
    enabled: true,
    id: testId("1102"),
    title: "Create a callback when confidence is low",
  },
  {
    condition: "The guest explicitly asks to speak with a manager.",
    destination: "duty-manager",
    enabled: true,
    id: testId("1103"),
    title: "Honor direct manager requests",
  },
] satisfies Prisma.AgentTransferRuleCreateManyInput[];
