"use client";
import { useState } from "react";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
export default function LandingPreview() {
  const [product, setProduct] = useState(false);
  const [review, setReview] = useState(false);
  const [name, setName] = useState("");
  const [choice, setChoice] = useState("Home cleaning");
  return (
    <div className="landing-demo">
      <div className="demo-tabs" role="group" aria-label="Example form type">
        <button
          type="button"
          aria-pressed={!product}
          onClick={() => {
            setProduct(false);
            setReview(false);
            setChoice("Home cleaning");
          }}
        >
          Service enquiry
        </button>
        <button
          type="button"
          aria-pressed={product}
          onClick={() => {
            setProduct(true);
            setReview(false);
            setChoice("Classic bouquet");
          }}
        >
          Product order
        </button>
      </div>
      <div className="demo-content">
        <span className="demo-tag">
          SERVICE & PRODUCT EXAMPLE · NOTHING IS SUBMITTED
        </span>
        <div className="demo-business">
          <span>{product ? "B" : "W"}</span>
          <strong>{product ? "Bloom & Co." : "Willow Home Services"}</strong>
        </div>
        {review ? (
          <>
            <span className="demo-check">
              <Check size={26} />
            </span>
            <h2>The details, all together.</h2>
            <p>
              This is how a customer reviews their request before continuing to
              WhatsApp.
            </p>
            <dl>
              <div>
                <dt>Name</dt>
                <dd>{name || "Alex Morgan"}</dd>
              </div>
              <div>
                <dt>{product ? "Product" : "Service"}</dt>
                <dd>{choice}</dd>
              </div>
              {product && (
                <div>
                  <dt>Estimated total</dt>
                  <dd>
                    {choice === "Classic bouquet" ? "AED 120" : "AED 180"}
                  </dd>
                </div>
              )}
            </dl>
            <div className="demo-explanation">
              <MessageCircle size={19} />
              <span>
                On a live form, the request is saved first. The customer then
                opens WhatsApp and taps Send.
              </span>
            </div>
            <button className="btn full" onClick={() => setReview(false)}>
              Back to example
            </button>
          </>
        ) : (
          <>
            <h2>
              {product
                ? "A little something lovely."
                : "A home that feels like new."}
            </h2>
            <p>
              {product
                ? "Choose a bouquet. We’ll confirm the finishing touches together."
                : "Tell us what you need. We’ll take it from there."}
            </p>
            <label htmlFor="demo-name">Your name</label>
            <input
              id="demo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              maxLength={80}
            />
            <fieldset>
              <legend>
                {product ? "Choose your bouquet" : "What can we help with?"}
              </legend>
              {(product
                ? ["Classic bouquet", "Signature bouquet"]
                : ["Home cleaning", "Deep cleaning"]
              ).map((v, i) => (
                <label
                  className={"demo-choice " + (choice === v ? "selected" : "")}
                  key={v}
                >
                  <input
                    type="radio"
                    name="demo-choice"
                    checked={choice === v}
                    onChange={() => setChoice(v)}
                  />
                  <span>{v}</span>
                  {product && <strong>AED {i ? 180 : 120}</strong>}
                </label>
              ))}
            </fieldset>
            <button
              className="btn primary full"
              onClick={() => setReview(true)}
            >
              Preview the next step <ArrowRight size={18} />
            </button>
            <small>
              {product
                ? "Final price and availability are confirmed by the business."
                : "A preferred date is a request, not a confirmed appointment."}
            </small>
          </>
        )}
      </div>
    </div>
  );
}
