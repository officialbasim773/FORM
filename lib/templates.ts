import { Draft, Question, Product } from "./model";
const q = (
  id: string,
  label: string,
  type: Question["type"] = "short text",
  required = true,
  options: string[] = [],
): Question => ({ id, label, type, required, options });
const details = [
  q("name", "Your name"),
  q("phone", "WhatsApp number", "phone"),
];
export const cake: Product = {
  id: "cake",
  name: "Celebration cake",
  description:
    "Made to order, finished by hand. Choose your size and favourite flavour.",
  image: "",
  price: 18000,
  hidden: false,
  min: 1,
  max: 5,
  allowNote: true,
  options: [
    {
      id: "size",
      name: "Size",
      type: "choice",
      required: true,
      values: [
        { id: "six", label: "6-inch · serves 6–8", adjustment: 0 },
        { id: "eight", label: "8-inch · serves 10–14", adjustment: 7000 },
      ],
    },
    {
      id: "flavour",
      name: "Flavour",
      type: "choice",
      required: true,
      values: [
        { id: "vanilla", label: "Vanilla bean", adjustment: 0 },
        { id: "chocolate", label: "Dark chocolate", adjustment: 2000 },
      ],
    },
    {
      id: "inscription",
      name: "Cake inscription",
      type: "text",
      required: false,
      values: [],
    },
  ],
};
export const bouquet: Product = {
 id: "bouquet", name: "Seasonal bouquet", description: "Fresh seasonal flowers, arranged by hand.", image: "", price: 12000, hidden: false, min: 1, max: 20, allowNote: true,
 options: [{ id: "size", name: "Bouquet size", type: "choice", required: true, values: [{ id: "standard", label: "Standard", adjustment: 0 }, { id: "large", label: "Large", adjustment: 6000 }] }, { id: "card", name: "Card message", type: "text", required: false, values: [] }]
};
export const TEMPLATES = [
  {
    id: "contact",
    title: "Contact enquiry",
    type: "service",
    description: "A simple way to start a conversation.",
    questions: [
      ...details,
      q("email", "Email address", "email", false),
      q("request", "How can we help?", "long text"),
    ],
  },
  {
    id: "appointment",
    title: "Appointment request",
    type: "service",
    description: "Collect a preferred date, time and service.",
    questions: [
      ...details,
      q("service", "Which service?", "single choice", true, [
        "Consultation",
        "Follow-up",
        "Other",
      ]),
      q("date", "Preferred date", "date"),
      q("time", "Preferred time", "time"),
      q("notes", "Anything else?", "long text", false),
    ],
  },
  {
    id: "quote",
    title: "Quote request",
    type: "service",
    description: "Get the details you need to prepare a quote.",
    questions: [
      ...details,
      q("service", "What do you need?", "single choice", true, [
        "Home cleaning",
        "Deep cleaning",
        "Move-in cleaning",
      ]),
      q("location", "Service address", "address"),
      q("date", "Preferred date", "date"),
      q("notes", "Tell us about your request", "long text", false),
    ],
  },
  {
    id: "product",
    title: "Product order",
    type: "product",
    description: "Products, quantities and delivery details.",
    questions: [
      ...details,
      q("address", "Delivery address", "address"),
      q("note", "Order notes", "long text", false),
    ],
  },
  {
    id: "cake",
    title: "Cake order",
    type: "product",
    description: "Flavours, sizes and a personal finishing touch.",
    questions: [
      ...details,
      q("date", "Required date", "date"),
      q("address", "Delivery address", "address"),
    ],
  },
  {
    id: "event",
    title: "Event registration",
    type: "service",
    description: "Guest details and everything you need to host.",
    questions: [
      ...details,
      q("email", "Email address", "email"),
      q("guests", "Number of guests", "number"),
      q("notes", "Access or dietary requirements", "long text", false),
    ],
  },
  {
    id: "blank",
    title: "Blank form",
    type: "service",
    description: "Start with a name and build from there.",
    questions: [q("name", "Your name")],
  },
] as const;
export function template(id: string, type?: "service" | "product"): Draft {
  const t = TEMPLATES.find((x) => x.id === id) || TEMPLATES[0];
  return {
    title: t.title,
    description: t.description,
    type: type || t.type,
    currency: "AED",
    accent: "#176650",
    button: "#176650",
    hideLogo: false,
    questions: structuredClone([...t.questions]) as Question[],
    products: (type || t.type) === "product" ? (id === "blank" ? [] : [structuredClone(id === "cake" ? cake : bouquet)]) : [],
  };
}
