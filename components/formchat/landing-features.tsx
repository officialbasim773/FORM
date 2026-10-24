"use client";

import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  GitBranch,
  Palette,
  Inbox,
  CalendarDays,
  ListChecks,
  Image,
  Eye,
  SlidersHorizontal,
  ShoppingBag,
  Download,
  Users,
  Clock3,
  FileText,
  MessageCircle,
  Send,
  MousePointer2,
  Type,
  LayoutTemplate,
  CircleCheck,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    label: "Smart forms",
    Icon: GitBranch,
    tag: "Ask the right follow-up",
    title: "A form that follows the conversation.",
    body: "Keep things relevant. Guide customers through questions that adapt to their answers, in a layout that feels natural.",
    items: [
      { Icon: GitBranch, text: "Conditional follow-up questions" },
      { Icon: ListChecks, text: "Single-page, sections or one at a time" },
      { Icon: Eye, text: "Preview the customer experience" },
    ],
    cta: "Try a form",
    href: "#examples",
  },
  {
    label: "Your brand",
    Icon: Palette,
    tag: "Make it feel like you",
    title: "Your style. In every little detail.",
    body: "Welcome customers with your own colours and imagery. Give every form the personality of your business.",
    items: [
      { Icon: Palette, text: "Business colours and button styles" },
      { Icon: Image, text: "Your images and visual choices" },
      { Icon: Type, text: "Helpful descriptions and question hints" },
    ],
    cta: "Create your own form",
    href: "",
  },
  {
    label: "Customer requests",
    Icon: Inbox,
    tag: "Keep the full picture",
    title: "From first enquiry to next steps.",
    body: "Keep customer answers together. Collect product requests, organise responses, and pick up the conversation with all the context.",
    items: [
      { Icon: ShoppingBag, text: "Products, options and quantities" },
      { Icon: Download, text: "Response exports and status tracking" },
      { Icon: MessageCircle, text: "Prepared WhatsApp message handoff" },
    ],
    cta: "Explore the form example",
    href: "#examples",
  },
  {
    label: "Appointments",
    Icon: CalendarDays,
    tag: "Make time for your customers",
    title: "A booking experience of its own.",
    body: "Let customers choose a service and an available time. Review each request, then manage the appointment from your workspace.",
    items: [
      { Icon: Clock3, text: "Working hours, breaks and buffers" },
      { Icon: Users, text: "Availability for each team member" },
      { Icon: CircleCheck, text: "Accept, decline and reschedule" },
    ],
    cta: "Explore booking features",
    href: "#appointments",
  },
];

function FeatureIllustration({ index }: { index: number }) {
  return (
    <div
      className={`mk-tab-art mk-tab-art-${index}`}
      role="img"
      aria-label={`${features[index].label} illustration with sample content`}
    >
      <div className="mk-art-toolbar">
        <span />
        <span />
        <span />
        <small>
          {
            [
              "PROJECT ENQUIRY",
              "FORM APPEARANCE",
              "RESPONSES INBOX",
              "BOOKING REQUEST",
            ][index]
          }
        </small>
        <SlidersHorizontal size={13} />
      </div>
      {index === 0 ? (
        <div className="mk-flow-art">
          <div className="mk-art-question">
            <span className="mk-art-label">
              <ListChecks size={14} /> Single choice
            </span>
            <h4>What can we help you with?</h4>
            <span className="mk-art-answer">
              <CircleCheck size={16} /> A new website
            </span>
            <span className="mk-art-answer">Brand design</span>
          </div>
          <div className="mk-flow-connector">
            <span />
            <GitBranch size={17} />
            <small>If “A new website”</small>
          </div>
          <div className="mk-art-followup">
            <span className="mk-art-label">
              <Type size={14} /> Follow-up question
            </span>
            <strong>Tell us about your project.</strong>
            <div className="mk-art-line" />
            <div className="mk-art-line short" />
          </div>
          <div className="mk-art-badge">
            <Check size={13} /> Only relevant questions
          </div>
        </div>
      ) : index === 1 ? (
        <div className="mk-brand-art">
          <span className="mk-art-label">
            <LayoutTemplate size={14} /> Your form, your style
          </span>
          <div className="mk-branded-form">
            <div className="mk-art-cover">
              <div />
              <div />
              <div />
            </div>
            <span className="mk-studio-icon">
              <FileText size={23} />
            </span>
            <h4>A little more you.</h4>
            <p>A welcoming first impression.</p>
            <div className="mk-art-input">
              Your name <span>Required</span>
            </div>
            <span className="mk-art-submit">
              Continue <ChevronRight size={13} />
            </span>
          </div>
          <div className="mk-colour-tools">
            <Palette size={17} />
            {["#176650", "#a6bc8a", "#dfbb74", "#d6a1a5", "#c7d8c4"].map(
              (colour, i) => (
                <span key={colour} style={{ background: colour }}>
                  {i === 0 && <Check size={13} />}
                </span>
              ),
            )}
            <i />
            <Type size={17} />
          </div>
          <MousePointer2 className="mk-art-cursor" size={27} />
        </div>
      ) : index === 2 ? (
        <div className="mk-requests-art">
          <div className="mk-art-inbox-heading">
            <Inbox size={22} />
            <div>
              <h4>Customer requests</h4>
              <p>Everything you need to reply.</p>
            </div>
          </div>
          {[
            ["Website enquiry", "Alex Morgan", "New"],
            ["Product request", "Jamie Lee", "In progress"],
          ].map(([title, name, status]) => (
            <div className="mk-art-request" key={title}>
              <FileText size={19} />
              <div>
                <b>{title}</b>
                <small>{name}</small>
              </div>
              <span>{status}</span>
            </div>
          ))}
          <div className="mk-message-preview">
            <span>
              <MessageCircle size={15} /> Prepared message
            </span>
            <p>
              Hi! I’m interested in a new website.
              <br />
              Here are my project details…
            </p>
            <small>
              Customer taps Send in WhatsApp <Send size={12} />
            </small>
          </div>
          <div className="mk-art-badge">
            <CircleCheck size={13} /> Response saved first
          </div>
        </div>
      ) : (
        <div className="mk-schedule-art">
          <div className="mk-art-service">
            <span>
              <CalendarDays size={23} />
            </span>
            <div>
              <h4>Discovery consultation</h4>
              <p>30 min · Alex Morgan</p>
            </div>
          </div>
          <div className="mk-art-availability">
            <span>
              <Clock3 size={14} /> Sample availability
            </span>
            <div>
              {["09:00", "10:30", "11:00", "14:00"].map((t, i) => (
                <span className={i === 1 ? "selected" : ""} key={t}>
                  {t}
                  {i === 1 && <Check size={11} />}
                </span>
              ))}
            </div>
          </div>
          <div className="mk-art-booking-summary">
            <span className="mk-art-pending">Pending approval</span>
            <h4>A new appointment request.</h4>
            <p>Discovery consultation · 10:30</p>
            <div>
              <span>
                <Check size={13} /> Accept
              </span>
              <span>Decline</span>
            </div>
          </div>
          <div className="mk-art-badge">
            <Users size={13} /> Your availability. Your control.
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingFeatures({ start }: { start: string }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <section
      className="mk-feature-explorer mk-container"
      aria-labelledby="feature-explorer-heading"
    >
      <div className="mk-section-heading">
        <span className="mk-kicker">BUILT FOR THE WAY YOU WORK</span>
        <h2 id="feature-explorer-heading">
          Everything you expect.
          <br />
          Thoughtfully put together.
        </h2>
        <p>
          From your first question to your next appointment, give every customer
          a clear way forward.
        </p>
      </div>
      <div
        className="mk-feature-tabs"
        role="tablist"
        aria-label="Explore FormChat features"
      >
        {features.map(({ label, Icon }, i) => (
          <button
            type="button"
            key={label}
            role="tab"
            id={`feature-tab-${i}`}
            aria-controls={`feature-panel-${i}`}
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              let next = i;
              if (event.key === "ArrowRight") next = (i + 1) % features.length;
              else if (event.key === "ArrowLeft")
                next = (i + features.length - 1) % features.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = features.length - 1;
              else return;
              event.preventDefault();
              setActive(next);
              tabs.current[next]?.focus();
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
      {features.map((f, i) => (
        <div
          key={f.label}
          role="tabpanel"
          id={`feature-panel-${i}`}
          aria-labelledby={`feature-tab-${i}`}
          hidden={active !== i}
          tabIndex={0}
          className="mk-feature-panel"
        >
          <div className="mk-feature-panel-copy">
            <span className="mk-panel-tag">
              <span />
              {f.tag}
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
            <ul>
              {f.items.map(({ Icon, text }) => (
                <li key={text}>
                  <Icon size={18} />
                  {text}
                </li>
              ))}
            </ul>
            <a href={f.href || start}>
              {f.cta}
              <ArrowUpRight size={17} />
            </a>
          </div>
          <FeatureIllustration index={i} />
        </div>
      ))}
      <div className="mk-explorer-actions">
        <a className="mk-button" href={start}>
          Start building for free
          <ArrowUpRight size={17} />
        </a>
        <a href="#examples">
          Try the live examples <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}
