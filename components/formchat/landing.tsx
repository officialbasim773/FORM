import {
  ArrowRight,
  Check,
  FileText,
  MessageCircle,
  Inbox,
  Link2,
  ShoppingBag,
} from "lucide-react";
import { PRODUCT_NAME, PLANS } from "@/lib/config";
import LandingExamples from "./landing-examples";

export default function Landing({ signedIn = false }: { signedIn?: boolean }) {
  const start = signedIn ? "/" : "/sign-in?return_to=/";
  const cta = signedIn ? "Open your workspace" : "Create your free form";
  return (
    <main className="landing landing-refresh conversion-landing">
      <nav className="landing-nav" aria-label="Main navigation">
        <a className="brand" href="/about">
          <span className="brand-mark">f</span>
          {PRODUCT_NAME}
        </a>
        <div>
          <a href="#examples">Examples</a>
          <a href="#benefits">Why FormChat</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>
        <a className="btn primary" href={start}>
          {signedIn ? "Open workspace" : "Start free"}
          <ArrowRight size={16} />
        </a>
      </nav>
      <section className="landing-hero">
        <div>
          <span className="eyebrow">
            FOR BUSINESSES THAT WORK THROUGH CONVERSATIONS
          </span>
          <h1>
            Less chasing details.
            <br />
            <em>More helping customers.</em>
          </h1>
          <p>
            Turn “Hi, I’m interested” into a useful enquiry. Collect what you
            need in a simple form, keep every response organised, and continue
            on WhatsApp.
          </p>
          <div className="landing-actions">
            <a className="btn primary" href={start}>
              {cta}
              <ArrowRight size={18} />
            </a>
            <a className="conversion-secondary" href="#examples">
              Try the examples <ArrowRight size={16} />
            </a>
          </div>
          <small>
            {PLANS.free.publishedForms} published form ·{" "}
            {PLANS.free.submissions} responses/month · No credit card
          </small>
          <div className="landing-proof">
            <span>
              <Check size={16} />
              No code to write
            </span>
            <span>
              <Check size={16} />
              Works on any phone
            </span>
            <span>
              <Check size={16} />
              Your questions & branding
            </span>
          </div>
        </div>
      </section>
      <LandingExamples />
      <section id="benefits" className="conversion-benefits">
        <div className="conversion-benefit-intro">
          <span className="eyebrow">A CLEARER START FOR EVERY CUSTOMER</span>
          <h2>
            Get to the useful part,
            <br />
            sooner.
          </h2>
        </div>
        <div className="conversion-benefit-grid">
          {[
            {
              Icon: FileText,
              title: "Ask once. Get the full picture.",
              body: "Collect the service, budget, preferences and contact details you need before replying.",
            },
            {
              Icon: Inbox,
              title: "Keep requests easy to find.",
              body: "Every submission lands in your Responses inbox, even if the customer never sends a WhatsApp message.",
            },
            {
              Icon: ShoppingBag,
              title: "Make product requests clearer.",
              body: "Let customers choose items, sizes and quantities with an estimated total. You confirm the final order.",
            },
          ].map(({ Icon, title, body }) => (
            <article key={title}>
              <span className="conversion-feature-icon">
                <Icon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works" className="landing-section conversion-how">
        <div className="landing-section-head">
          <span className="eyebrow">SIMPLE TO SET UP. EASY TO SHARE.</span>
          <h2>
            Your next enquiry starts
            <br />
            with one link.
          </h2>
        </div>
        <div className="conversion-steps">
          {[
            [
              "01",
              "Make it yours",
              "Start from a template or a blank form. Add your questions and match your business’s colours.",
            ],
            [
              "02",
              "Share your form",
              "Publish a link for your Instagram bio, website or messages. Use a QR code at your counter.",
            ],
            [
              "03",
              "Pick up the conversation",
              "Read the saved response and continue with the customer on WhatsApp. They tap Send themselves.",
            ],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <a className="btn primary" href={start}>
          {cta}
          <ArrowRight size={17} />
        </a>
      </section>
      <section className="conversion-control">
        <div>
          <span className="eyebrow">YOUR BUSINESS. YOUR PROCESS.</span>
          <h2>
            Ready when you are.
            <br />
            Flexible when things change.
          </h2>
        </div>
        <ul>
          <li>
            <Check />
            Preview the whole form before you publish.
          </li>
          <li>
            <Check />
            Keep edits private until you’re ready to share them.
          </li>
          <li>
            <Check />
            Ask follow-up questions only when they’re relevant.
          </li>
          <li>
            <Check />
            Keep appointment bookings on their own booking page.
          </li>
        </ul>
      </section>
      <section id="pricing" className="landing-section">
        <div className="landing-section-head">
          <span className="eyebrow">START SMALL, WITH ROOM TO GROW</span>
          <h2>Try it with your next enquiry.</h2>
          <p>
            Build your first form for free. No payment details to get started.
          </p>
        </div>
        <div className="landing-pricing">
          <article>
            <span className="eyebrow">FREE</span>
            <h3>
              $0 <small>to get started</small>
            </h3>
            <p>A simple way to collect your first enquiries.</p>
            <ul>
              <li>{PLANS.free.publishedForms} published form</li>
              <li>{PLANS.free.submissions} submissions per month</li>
              <li>Saved responses, share link and QR code</li>
              <li>WhatsApp message handoff</li>
            </ul>
            <a className="btn primary" href={start}>
              {cta}
              <ArrowRight size={17} />
            </a>
          </article>
          <article>
            <span className="eyebrow">BUSINESS · PLANNED PRICING</span>
            <h3>
              ${PLANS.business.monthlyPrice}
              <small>/month or ${PLANS.business.yearlyPrice}/year</small>
            </h3>
            <p>For product orders and growing request volumes.</p>
            <ul>
              <li>{PLANS.business.publishedForms} published forms</li>
              <li>
                {PLANS.business.submissions.toLocaleString("en")} submissions
                per month
              </li>
              <li>Product options and price estimates</li>
              <li>CSV export and analytics</li>
            </ul>
            <div className="pricing-note">
              Paid checkout is not available yet. You can start with a free
              workspace; no payment is collected.
            </div>
          </article>
        </div>
      </section>
      <section className="landing-section landing-faq">
        <div>
          <span className="eyebrow">BEFORE YOU GET STARTED</span>
          <h2>A few quick answers.</h2>
        </div>
        <div>
          {[
            [
              "Do my customers need an account?",
              "No. They can open your published link on their phone or computer and submit the form without signing up.",
            ],
            [
              "Do I need the WhatsApp Business API?",
              "No. FormChat prepares a message and opens WhatsApp. Your customer taps Send; messages are not sent automatically.",
            ],
            [
              "What if the customer doesn’t send the WhatsApp message?",
              "Their submitted response is already saved in your inbox. Opening WhatsApp is not required for you to receive the form submission.",
            ],
            [
              "Does a product form take payments?",
              "No. It collects an order request and estimated total. You confirm availability, delivery and final price directly with the customer.",
            ],
            [
              "Can I change a form after publishing?",
              "Yes. Edit your draft and publish the update when ready. Existing responses retain the details from the version your customer submitted.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="landing-cta">
        <div>
          <span className="eyebrow">MAKE YOUR NEXT CONVERSATION EASIER</span>
          <h2>
            One form.
            <br />A clearer starting point.
          </h2>
          <p>Start free. Share when you’re ready.</p>
        </div>
        <a className="btn" href={start}>
          {cta}
          <ArrowRight size={18} />
        </a>
      </section>
      <footer className="landing-footer">
        <strong>{PRODUCT_NAME}</strong>
        <span>Collect the details. Continue the conversation.</span>
        <a href="#pricing">Plans & pricing</a>
      </footer>
    </main>
  );
}
