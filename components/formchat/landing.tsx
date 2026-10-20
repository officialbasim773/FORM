import {
  ArrowUpRight,
  Check,
  FileText,
  CalendarDays,
  Inbox,
  Link2,
  QrCode,
  Palette,
  GitBranch,
  Users,
  MessageCircle,
  ChevronDown,
  LayoutTemplate,
  Eye,
  ShoppingBag,
  Download,
  Clock3,
  CircleCheck,
} from "lucide-react";
import { PRODUCT_NAME, PLANS } from "@/lib/config";
import LandingExamples from "./landing-examples";
import LandingFeatures from "./landing-features";

function ProductVisual({ kind }: { kind: "builder" | "inbox" | "booking" }) {
  return (
    <div
      className={`mk-product mk-${kind}`}
      role="img"
      aria-label={`${kind === "builder" ? "Form builder" : kind === "inbox" ? "Responses inbox" : "Appointment management"} illustration with sample content`}
    >
      <div className="mk-window">
        <span />
        <span />
        <span />
        <small>
          {kind === "builder"
            ? "Form builder"
            : kind === "inbox"
              ? "Responses"
              : "Appointments"}
        </small>
        <b>Sample workspace</b>
      </div>
      {kind === "builder" ? (
        <div className="mk-editor">
          <aside>
            <b>Project enquiry</b>
            <span className="chosen">1 · Your name</span>
            <span>2 · Choose a service</span>
            <span>3 · Project details</span>
            <span>+ Add question</span>
          </aside>
          <div>
            <small>QUESTION 1</small>
            <h3>What’s your name?</h3>
            <p>So we know what to call you.</p>
            <div className="mk-input">Type your answer here…</div>
            <span className="mk-mini-button">Next →</span>
            <div className="mk-progress">
              <i />
            </div>
          </div>
        </div>
      ) : kind === "inbox" ? (
        <div className="mk-inbox-content">
          <div className="mk-visual-title">
            <h3>Every enquiry. One place.</h3>
            <span>3 responses</span>
          </div>
          {[
            ["AM", "Alex Morgan", "Website design", "New"],
            ["JL", "Jamie Lee", "Brand identity", "In progress"],
            ["SK", "Sam Kim", "Product enquiry", "New"],
          ].map(([initials, name, service, status]) => (
            <div className="mk-response" key={name}>
              <i>{initials}</i>
              <div>
                <b>{name}</b>
                <small>{service}</small>
              </div>
              <span>{status}</span>
            </div>
          ))}
          <div className="mk-saved">
            <Check size={15} /> Saved before the WhatsApp handoff
          </div>
        </div>
      ) : (
        <div className="mk-booking-content">
          <span className="mk-pill">Booking requests</span>
          <h3>Your day, organised.</h3>
          {[
            [
              "09:00",
              "Discovery consultation",
              "30 min · Alex Morgan",
              "Pending",
            ],
            ["11:30", "Design review", "60 min · Jamie Lee", "Accepted"],
          ].map(([time, title, detail, status]) => (
            <div className="mk-booking-item" key={time}>
              <time>{time}</time>
              <div>
                <b>{title}</b>
                <small>{detail}</small>
                <span>{status}</span>
              </div>
            </div>
          ))}
          <div className="mk-booking-actions">
            <span>Accept</span>
            <span>Decline</span>
            <small>You stay in control.</small>
          </div>
        </div>
      )}
    </div>
  );
}
export default function Landing({ signedIn = false }: { signedIn?: boolean }) {
  const start = signedIn ? "/" : "/sign-in?mode=sign-up&return_to=/";
  const cta = signedIn ? "Open workspace" : "Get started free";
  return (
    <main className="fc-marketing">
      <nav className="mk-nav" aria-label="Main navigation">
        <a className="mk-brand" href="/about">
          <img src="/favicon.svg" alt="" width={31} height={31} />
          {PRODUCT_NAME}
        </a>
        <div className="mk-nav-links">
          <a href="#features">Features</a>
          <a href="#examples">Examples</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="mk-nav-actions">
          {!signedIn && (
            <a className="mk-login" href="/sign-in">
              Log in
            </a>
          )}
          <a className="mk-button" href={start}>
            {cta}
            <ArrowUpRight size={17} />
          </a>
        </div>
      </nav>
      <header className="mk-hero">
        <a className="mk-announcement" href="#appointments">
          <span>FORMS + BOOKINGS</span> One workspace for your business{" "}
          <ArrowUpRight size={13} />
        </a>
        <h1>
          Turn enquiries into
          <br />
          <em>your next customer.</em>
        </h1>
        <p>
          Collect the details you need with a branded form. Let customers book
          <br className="mk-desktop-break" /> an available time on a separate
          booking page. Manage both in one workspace.
        </p>
        <div className="mk-actions">
          <a className="mk-button" href={start}>
            {cta}
            <ArrowUpRight size={18} />
          </a>
          <a className="mk-button mk-outline" href="#examples">
            Try a live example <ArrowUpRight size={17} />
          </a>
        </div>
        <p className="mk-free-note">
          {PLANS.free.publishedForms} published form · {PLANS.free.submissions}{" "}
          responses/month · No credit card
        </p>
        <div className="mk-reassurance">
          <span>
            <Check size={16} />
            No code needed
          </span>
          <span>
            <Check size={16} />
            Your brand, your style
          </span>
          <span>
            <Check size={16} />
            Customers need no account
          </span>
        </div>
      </header>
      <div className="mk-demo-wrap">
        <LandingExamples start={start} />
      </div>
      <section className="mk-audience mk-container">
        <h2>From “I’m interested” to a clear next step.</h2>
        <p>
          Collect enquiries, organise product requests, or accept appointment
          bookings.
        </p>
        <div>
          <span>Independent businesses</span>
          <span>Creative studios</span>
          <span>Service providers</span>
          <span>Growing teams</span>
        </div>
      </section>
      <section
        className="mk-getting-started mk-container"
        aria-labelledby="getting-started-heading"
      >
        <div className="mk-section-heading">
          <span className="mk-kicker">A CLEAR PATH TO YOUR FIRST RESPONSE</span>
          <h2 id="getting-started-heading">
            Create. Share. Take the next step.
          </h2>
        </div>
        <ol>
          {[
            [
              "Make it yours",
              "Choose your questions, add your branding, and preview the experience.",
            ],
            [
              "Share one simple link",
              "Add your form or booking link to your website, bio, or customer messages.",
            ],
            [
              "Manage what comes in",
              "Read every saved response. Review appointment requests and accept the ones that fit.",
            ],
          ].map(([title, body], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section
        id="features"
        className="mk-features mk-container"
        aria-label="Product features"
      >
        <article className="mk-feature-row">
          <div className="mk-feature-copy">
            <span className="mk-kicker">MODERN FORM BUILDER</span>
            <h2>Make forms that feel like a conversation.</h2>
            <p>
              Build a clear, welcoming experience with your own questions,
              colours and images. Choose the layout that suits the way you work.
            </p>
            <ul>
              {[
                "One question at a time, sections or a single page",
                "Conditional questions that adapt to answers",
                "Your colours, images and question hints",
                "Preview before you publish",
              ].map((x, i) => {
                const Icon = [LayoutTemplate, GitBranch, Palette, Eye][i];
                return (
                  <li key={x}>
                    <span className="mk-list-icon">
                      <Icon size={17} />
                    </span>
                    {x}
                  </li>
                );
              })}
            </ul>
            <a href={start}>
              Build your first form <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="mk-visual-stage">
            <ProductVisual kind="builder" />
          </div>
        </article>
        <article className="mk-feature-row mk-reverse">
          <div className="mk-feature-copy">
            <span className="mk-kicker">CUSTOMER REQUESTS</span>
            <h2>
              All the details.
              <br />
              Already in your inbox.
            </h2>
            <p>
              Collect enquiries and product requests without piecing together a
              message thread. Every submitted response is saved and ready to
              review.
            </p>
            <ul>
              {[
                "Keep customer answers in one Responses inbox",
                "Collect products, options and quantities",
                "Prepare a clear WhatsApp message",
                "Export responses when you need them",
              ].map((x, i) => {
                const Icon = [Inbox, ShoppingBag, MessageCircle, Download][i];
                return (
                  <li key={x}>
                    <span className="mk-list-icon">
                      <Icon size={17} />
                    </span>
                    {x}
                  </li>
                );
              })}
            </ul>
            <small>
              Customers tap Send in WhatsApp. Their form response is saved
              first.
            </small>
          </div>
          <div className="mk-visual-stage mk-stage-warm">
            <ProductVisual kind="inbox" />
          </div>
        </article>
        <article id="appointments" className="mk-feature-row">
          <div className="mk-feature-copy">
            <span className="mk-kicker">APPOINTMENT BOOKING</span>
            <h2>Give your customers a time that works.</h2>
            <p>
              A dedicated booking page for your services. Set your availability,
              receive requests, and accept or decline from your workspace.
            </p>
            <ul>
              {[
                "Services, duration, starting prices and buffers",
                "Working hours, breaks and unavailable dates",
                "Available times for each team member",
                "Reschedule, cancel and track appointments",
              ].map((x, i) => {
                const Icon = [Clock3, CalendarDays, Users, CircleCheck][i];
                return (
                  <li key={x}>
                    <span className="mk-list-icon">
                      <Icon size={17} />
                    </span>
                    {x}
                  </li>
                );
              })}
            </ul>
            <a href="#examples">
              Try the booking experience <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="mk-visual-stage">
            <ProductVisual kind="booking" />
          </div>
        </article>
      </section>
      <LandingFeatures start={start} />
      <section className="mk-share mk-container">
        <div className="mk-section-heading">
          <h2>Share your form anywhere.</h2>
          <p>One link. Wherever your customers find you.</p>
        </div>
        <div className="mk-share-grid">
          {[
            [
              Link2,
              "Send a simple link",
              "In messages, email or your Instagram bio.",
            ],
            [
              QrCode,
              "Put it on a QR code",
              "At your counter, on a card or at an event.",
            ],
            [
              FileText,
              "Publish when you’re ready",
              "Keep edits in draft until you publish them.",
            ],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Link2;
            return (
              <article key={String(title)}>
                <div>
                  <I size={34} />
                </div>
                <h3>{String(title)}</h3>
                <p>{String(text)}</p>
              </article>
            );
          })}
        </div>
        <a className="mk-button" href={start}>
          Get started for free
          <ArrowUpRight size={17} />
        </a>
      </section>
      <section id="pricing" className="mk-pricing mk-container">
        <div className="mk-section-heading">
          <h2>Start free. Grow at your pace.</h2>
          <p>Try FormChat with your next customer enquiry.</p>
        </div>
        <div className="mk-plan-grid">
          <article>
            <span className="mk-kicker">FREE</span>
            <h3>
              $0<small> / to get started</small>
            </h3>
            <p>Start collecting real enquiries without payment details.</p>
            <ul>
              <li>
                <Check />
                {PLANS.free.publishedForms} published form
              </li>
              <li>
                <Check />
                {PLANS.free.submissions} submissions per month
              </li>
              <li>
                <Check />
                Saved responses, share links and QR codes
              </li>
              <li>
                <Check />
                WhatsApp message handoff
              </li>
            </ul>
            <a className="mk-button" href={start}>
              {cta}
              <ArrowUpRight size={17} />
            </a>
          </article>
          <article>
            <span className="mk-kicker">BUSINESS · PLANNED</span>
            <h3>
              ${PLANS.business.monthlyPrice}
              <small> / month</small>
            </h3>
            <p>More room for a growing business.</p>
            <ul>
              <li>
                <Check />
                {PLANS.business.publishedForms} published forms
              </li>
              <li>
                <Check />
                {PLANS.business.submissions.toLocaleString("en")} submissions
                per month
              </li>
              <li>
                <Check />
                Product options and price estimates
              </li>
              <li>
                <Check />
                CSV export and analytics
              </li>
            </ul>
            <small>
              Paid checkout is not available yet. No payment is collected.
            </small>
          </article>
        </div>
      </section>
      <section className="mk-faq mk-container">
        <div className="mk-section-heading">
          <h2>A few questions, answered.</h2>
        </div>
        {[
          [
            "Do customers need an account?",
            "No. Customers can open your published form or booking link without signing up.",
          ],
          [
            "Are forms and appointments separate?",
            "Yes. Forms collect enquiries and product requests. Appointments have a dedicated booking page and management area.",
          ],
          [
            "Does FormChat send WhatsApp messages automatically?",
            "No. FormChat saves the response and prepares a message. The customer opens WhatsApp and taps Send.",
          ],
          [
            "Can I take payments?",
            "Product forms collect requests and estimated totals. Online payments are not currently available.",
          ],
          [
            "Can I edit a published form?",
            "Yes. Your changes stay in draft until you publish an update. Existing responses keep the details submitted at the time.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <ChevronDown size={17} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <section className="mk-final">
        <div className="mk-container">
          <span className="mk-kicker">
            A LITTLE LESS ADMIN. A LOT MORE CLARITY.
          </span>
          <h2>
            Your next great customer
            <br />
            experience starts here.
          </h2>
          <p>
            Your first form includes {PLANS.free.submissions} responses per
            month. No credit card required.
          </p>
          <div className="mk-actions">
            <a className="mk-button" href={start}>
              {cta}
              <ArrowUpRight size={18} />
            </a>
            <a className="mk-button mk-outline" href="#examples">
              Try an example
            </a>
          </div>
        </div>
      </section>
      <footer className="mk-footer mk-container">
        <div>
          <a className="mk-brand" href="/about">
            <img src="/favicon.svg" alt="" width={31} height={31} />
            {PRODUCT_NAME}
          </a>
          <p>
            Collect the details.
            <br />
            Continue the conversation.
          </p>
          <small>
            © {new Date().getFullYear()} {PRODUCT_NAME}
          </small>
        </div>
        <div>
          <strong>Product</strong>
          <a href="#features">Forms</a>
          <a href="#appointments">Appointments</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div>
          <strong>Explore</strong>
          <a href="#examples">Try the examples</a>
          <a href={start}>Get started</a>
          <a href="/sign-in">Log in</a>
        </div>
      </footer>
    </main>
  );
}
