"use client";
import { useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import ExperiencePicker from "./experience-picker";
import Customer from "./customer";
import { Draft } from "@/lib/model";
const example: Draft = {
  title: "A little something lovely.",
  description: "Find flowers that feel just right.",
  type: "service",
  currency: "USD",
  accent: "#176650",
  button: "#176650",
  hideLogo: false,
  products: [],
  pages: [
    { id: "flowers", title: "Find your flowers" },
    { id: "details", title: "Make it personal" },
  ],
  interactive: {
    welcome: false,
    progress: true,
    keyboard: true,
    startLabel: "Find my flowers",
    welcomeTitle: "Good things start with flowers.",
    welcomeDescription:
      "A thoughtful gift, a little celebration, or just because. Let’s find your favourite.",
    media: {
      src: "/demo/garden.svg",
      alt: "An illustrated arrangement of peach flowers in a cream vase",
      fit: "cover",
      layout: "above",
    },
  },
  questions: [
    {
      id: "style",
      label: "Which style feels like you?",
      description: "Choose the arrangement you love most.",
      type: "single choice",
      required: true,
      options: ["Garden classics", "A little sunshine", "Soft & romantic"],
      optionImages: {
        "Garden classics": "/demo/garden.svg",
        "A little sunshine": "/demo/sunshine.svg",
        "Soft & romantic": "/demo/soft.svg",
      },
      pageId: "flowers",
    },
    {
      id: "occasion",
      label: "What’s the occasion?",
      type: "single choice",
      required: true,
      options: ["A birthday", "Just because", "A thank you"],
      pageId: "details",
    },
    {
      id: "message",
      label: "Add a little note",
      description: "Optional. Make it personal in a few words.",
      type: "long text",
      required: false,
      options: [],
      pageId: "details",
    },
  ],
};
export default function LandingExperiences({ start }: { start: string }) {
  const [experience, setExperience] = useState<
    "classic" | "multipage" | "interactive"
  >("interactive");
  const [reset, setReset] = useState(0);
  return (
    <section
      id="form-experiences"
      className="landing-section experience-showcase"
    >
      <div className="landing-section-head">
        <span className="eyebrow">TRY IT FOR YOURSELF</span>
        <h2>
          A form that feels like
          <br />a conversation.
        </h2>
        <p>
          Click through a real example. Pick your favourite layout. Nothing you
          enter here is saved.
        </p>
      </div>
      <div className="experience-showcase-grid">
        <div className="experience-showcase-copy">
          <ExperiencePicker value={experience} onChange={setExperience} />
          <div className="experience-benefits">
            <h3>
              {experience === "interactive"
                ? "Make answering feel effortless."
                : experience === "multipage"
                  ? "Break the details into easy steps."
                  : "Everything in one familiar view."}
            </h3>
            <p>
              {experience === "interactive"
                ? "Welcome customers with your own images. Let them choose from pictures, answer one question at a time, and submit straight to WhatsApp."
                : experience === "multipage"
                  ? "Group related questions together. Customers can move back and forth while keeping their answers."
                  : "A straightforward form for quick enquiries and returning customers. Scan the questions and fill them in at your own pace."}
            </p>
            {[
              "Your images, colours and question hints",
              "Conditional questions that adapt to answers",
              "Every submitted request in your inbox",
            ].map((s) => (
              <div className="row" key={s}>
                <Check size={17} />
                <span>{s}</span>
              </div>
            ))}
          </div>
          <a className="btn primary" href={start}>
            Create a form like this
            <ArrowRight size={17} />
          </a>
        </div>
        <div className="experience-live-demo">
          <header>
            <span>
              <i />
              LIVE EXAMPLE · NOTHING IS SAVED
            </span>
            <button
              type="button"
              aria-label="Restart form example"
              onClick={() => setReset((n) => n + 1)}
            >
              <RotateCcw size={15} />
              Restart
            </button>
          </header>
          <div className="experience-demo-scroll">
            <Customer
              key={experience + reset}
              draft={{ ...example, experience }}
              business={{ name: "Bloom & Co.", logo: "" }}
              preview
            />
          </div>
        </div>
      </div>
    </section>
  );
}
