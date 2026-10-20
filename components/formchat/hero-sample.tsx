"use client";
import { useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
export default function HeroSample() {
  const [choice, setChoice] = useState("");
  const [finished, setFinished] = useState(false);
  return (
    <div className="hero-sample-scene">
      <span className="hero-sample-caption">
        A little preview. Go ahead, try it.
      </span>
      <div className="hero-sample-card">
        <div className="hero-sample-brand">
          <span>b.</span>
          <strong>Bloom studio</strong>
          <small>EXAMPLE FORM</small>
        </div>
        {finished ? (
          <div className="hero-sample-result">
            <span className="hero-sample-check">
              <Check size={30} />
            </span>
            <h2>A lovely choice.</h2>
            <p>
              You chose {choice.toLowerCase()}. On your own form, every answer
              has a place.
            </p>
            <p className="small">This is a demo. Nothing was saved or sent.</p>
            <button
              className="btn"
              onClick={() => {
                setFinished(false);
                setChoice("");
              }}
            >
              <RotateCcw size={16} />
              Try again
            </button>
          </div>
        ) : (
          <>
            <span className="hero-sample-step">01 / A LITTLE ABOUT YOU</span>
            <h2>
              What brings you
              <br />
              here today?
            </h2>
            <p>Choose one. We’ll take it from there.</p>
            <div
              className="hero-sample-choices"
              role="group"
              aria-label="Try a sample question"
            >
              {[
                "Flowers for someone special",
                "Something for my space",
                "An event worth celebrating",
              ].map((label, i) => (
                <button
                  key={label}
                  aria-pressed={choice === label}
                  onClick={() => setChoice(label)}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {label}
                  {choice === label && <Check size={17} />}
                </button>
              ))}
            </div>
            <button
              className="btn primary"
              disabled={!choice}
              onClick={() => setFinished(true)}
            >
              Continue <ArrowRight size={17} />
            </button>
            <small className="hero-sample-note">
              Interactive demo · no details collected
            </small>
          </>
        )}
        <div className="hero-sample-credit">
          Made with <strong>FormChat</strong>
        </div>
      </div>
      <div className="hero-sample-tag">
        <Check size={16} />
        <span>
          Your questions.
          <br />
          <strong>Your kind of form.</strong>
        </span>
      </div>
    </div>
  );
}
