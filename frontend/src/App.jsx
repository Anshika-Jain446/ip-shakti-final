import { useState, useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";

import heroBgVideo from "../landing-page/bacground white white sheet.mp4";

const API_ENDPOINTS = [
  "https://ip-sakti-yadl.onrender.com",
];

/* Safely convert any value to a renderable string */
function toStr(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  // For objects/arrays, stringify them
  try { return JSON.stringify(val); } catch { return String(val); }
}

function getDomainMetrics(result, domainCode) {
  const domains = Array.isArray(result.domains) ? result.domains : [];
  const isIncluded = domains.includes(domainCode);
  const confScore =
    typeof result.confidence?.score === "number"
      ? Math.max(0, Math.min(1, result.confidence.score))
      : 0;

  // The backend routes the product to domains. Do not invent domain-specific
  // risk scores by multiplying the overall confidence.
  if (isIncluded) {
    return {
      width: `${Math.round(confScore * 100)}%`,
      label: "Routed",
      color: "#3F6844",
    };
  }

  return {
    width: "0%",
    label: "Not routed",
    color: "#6b7280",
  };
}

function formatEvidenceScore(score) {
  if (typeof score !== "number") return toStr(score);
  if (score <= 1) return `${Math.round(score * 100)}%`;
  if (score <= 10) return `${Math.round(score * 10)}%`;
  return `${Math.round(Math.min(score, 100))}%`;
}


/* Browser voice input for the product-intake fields.
   Keeps voice as an input method; analysis still comes only from the backend. */
function VoiceInput({ value, onChange, language = "en-IN" }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onChange(value ? `${value}, ${transcript}` : transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supported) return null;

  function toggleVoice() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      try {
        recognition.stop();
      } catch {}
    } else {
      try {
        recognition.lang = language;
        recognition.start();
      } catch {}
    }
  }

  return (
    <button
      type="button"
      onClick={toggleVoice}
      className={`voice-input-button ${listening ? "voice-listening" : ""}`}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={listening ? "Listening... click to stop" : "Speak product details"}
    >
      {listening ? "⏹ Stop listening" : "🎙 Voice input"}
    </button>
  );
}

function Dashboard() {
  const [form, setForm] = useState({
    product_name: "Ashwa Joint Relief",
    ingredients: "Ashwagandha, Turmeric",
    purpose: "Joint pain",
    product_type: "Ayurvedic formulation",
    jurisdiction: "India",
    based_on_traditional_knowledge: "Not sure",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");

  function update(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function analyze(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const payload = {
      ...form,
      ingredients: form.ingredients
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };

    let lastError = "Analysis service unavailable.";

    for (const host of API_ENDPOINTS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(`${host}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setResult(data);
          setLoading(false);
          return;
        }

        let detail = "";
        try {
          const errorBody = await response.json();
          detail = errorBody?.detail
            ? ` ${toStr(errorBody.detail)}`
            : "";
        } catch {
          // Ignore non-JSON error bodies.
        }

        lastError = `Analysis service returned ${response.status}.${detail}`;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError =
          err?.name === "AbortError"
            ? "Analysis timed out. Please try again."
            : "Could not reach the analysis service.";
      }
    }

    setError(lastError);
    setLoading(false);
  }


  /* Extract a human-readable reasoning string from the backend response */
  function getReasoningText(res) {
    if (res.llm_reasoning) {
      if (typeof res.llm_reasoning === "string") return res.llm_reasoning;
      if (res.llm_reasoning.answer) return res.llm_reasoning.answer;
      if (res.llm_reasoning.message) return res.llm_reasoning.message;
    }
    if (res.reasoning) {
      if (typeof res.reasoning === "string") return res.reasoning;
      if (res.reasoning.answer) return res.reasoning.answer;
      if (res.reasoning.summary) return res.reasoning.summary;
    }
    return "No reasoning available.";
  }

  /* Extract validation status */
  function getValidationStatus(res) {
    if (!res.validation) return "UNKNOWN";
    if (res.validation.status) return res.validation.status;
    if (res.validation.is_supported) return "SUPPORTED";
    return "UNSUPPORTED";
  }

  /* Extract validation message */
  function getValidationMessage(res) {
    if (!res.validation) return "";
    if (res.validation.message) return toStr(res.validation.message);
    if (res.validation.summary) return toStr(res.validation.summary);
    const parts = [];
    if (res.validation.supported_domains?.length) {
      parts.push("Supported: " + res.validation.supported_domains.join(", "));
    }
    if (res.validation.unsupported_domains?.length) {
      parts.push("Unsupported: " + res.validation.unsupported_domains.join(", "));
    }
    return parts.join(" · ") || toStr(res.validation.status);
  }

  return (
    <div className="app app-dashboard-page">
      <div className="dashboard-video-bg">
        <video
          className="bg-video"
          src={heroBgVideo}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="dashboard-video-overlay" />
      </div>

      <header className="hero">
        <div>
          <div className="eyebrow">CODEHUNTERS HACKATHON MVP</div>
          <h1>IP-SAKTI</h1>
          <p>
            Evidence-first assistant for preliminary IP, Traditional Knowledge
            and ABS assessment.
          </p>
        </div>
        <div className="architecture-pill">
          Intake → Classify → Route → Retrieve → Verify → Act
        </div>
      </header>

      <main className="layout">
        <section className="card">
          <div className="card-header-row">
            <div className="card-eyebrow">ANALYSIS QUERY</div>
            <div className="card-number">01</div>
          </div>
          <h2>1. Product Intake</h2>
          <p className="muted">
            Start with what the user actually knows. The system should not
            assume missing facts.
          </p>

          <div className="voice-intake-panel">
            <div>
              <strong>Voice-assisted intake</strong>
              <p className="muted">
                Speak product details directly into the intake fields. Voice is
                only an input method; the backend remains the source of truth
                for classification, confidence, evidence and action plan.
              </p>
            </div>
            <label className="voice-language-label">
              Voice language
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi</option>
                <option value="mr-IN">Marathi</option>
              </select>
            </label>
          </div>

          <form onSubmit={analyze}>
            <label>Product name</label>
            <div className="voice-field">
              <input
                value={form.product_name}
                onChange={(e) => update("product_name", e.target.value)}
                required
              />
              <VoiceInput
                value={form.product_name}
                onChange={(value) => update("product_name", value)}
                language={voiceLanguage}
              />
            </div>

            <label>Ingredients / components</label>
            <div className="voice-field">
              <input
                value={form.ingredients}
                onChange={(e) => update("ingredients", e.target.value)}
                placeholder="Comma separated"
              />
              <VoiceInput
                value={form.ingredients}
                onChange={(value) => update("ingredients", value)}
                language={voiceLanguage}
              />
            </div>

            <label>Intended use</label>
            <div className="voice-field">
              <textarea
                value={form.purpose}
                onChange={(e) => update("purpose", e.target.value)}
              />
              <VoiceInput
                value={form.purpose}
                onChange={(value) => update("purpose", value)}
                language={voiceLanguage}
              />
            </div>

            <label>Product type</label>
            <select
              value={form.product_type}
              onChange={(e) => update("product_type", e.target.value)}
            >
              <option>Ayurvedic formulation</option>
              <option>Herbal product</option>
              <option>Food</option>
              <option>Cosmetic</option>
              <option>Other</option>
            </select>

            <label>Jurisdiction</label>
            <select
              value={form.jurisdiction}
              onChange={(e) => update("jurisdiction", e.target.value)}
            >
              <option>India</option>
            </select>

            <label>Based on traditional knowledge?</label>
            <select
              value={form.based_on_traditional_knowledge}
              onChange={(e) =>
                update("based_on_traditional_knowledge", e.target.value)
              }
            >
              <option>Not sure</option>
              <option>Yes</option>
              <option>No</option>
            </select>

            <button disabled={loading}>
              {loading ? "Analyzing..." : "ANALYZE PRODUCT →"}
            </button>
          </form>

          {error && <div className="error">{error}</div>}
        </section>

        <section className="results">
          {!result && (
            <div className="empty card">
              <div className="card-header-row" style={{ width: '100%' }}>
                <div className="card-eyebrow">FIELD JOURNAL</div>
                <div className="card-number">02</div>
              </div>
              <div className="big-icon">🌿</div>
              <h2>Your analysis will appear here</h2>
              <p className="muted">
                The prototype will classify the product, route it to IP/TK/ABS,
                retrieve evidence, validate the response and create an action
                plan.
              </p>
            </div>
          )}

          {result && (
            <>
              {/* CLASSIFICATION */}
              <div className="card">
                <div className="card-header-row">
                  <div className="card-eyebrow">PRELIMINARY CLASSIFICATION</div>
                  <div className="card-number">02</div>
                </div>
                <div className="result-header">
                  <div>
                    <h2>{toStr(result.classification?.label || result.classification?.product_type || "Unknown")}</h2>
                  </div>
                  <div className="status">{getValidationStatus(result)}</div>
                </div>
                <ul>
                  {result.classification?.reasons
                    ? result.classification.reasons.map((r, i) => (
                        <li key={i}>{toStr(r)}</li>
                      ))
                    : (
                      <>
                        {result.classification?.classification_note && (
                          <li>{toStr(result.classification.classification_note)}</li>
                        )}
                        {result.classification?.traditional_knowledge_status && (
                          <li>TK Status: {toStr(result.classification.traditional_knowledge_status)}</li>
                        )}
                        {result.classification?.jurisdiction && (
                          <li>Jurisdiction: {toStr(result.classification.jurisdiction)}</li>
                        )}
                      </>
                    )
                  }
                </ul>
              </div>

              {/* DOMAIN ROUTER + CONFIDENCE */}
              <div className="grid">
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-eyebrow">DOMAIN STATUS</div>
                    <div className="card-number">03</div>
                  </div>
                  <h3>Domain Router</h3>
                  <div className="chips">
                    {(result.domains || []).map((d) => (
                      <span className="chip" key={d}>{toStr(d)}</span>
                    ))}
                  </div>

                  <div className="domain-bar-group">
                    {(() => {
                      const tk = getDomainMetrics(result, "TK");
                      const abs = getDomainMetrics(result, "ABS");
                      const ip = getDomainMetrics(result, "IP");
                      return (
                        <>
                          <div className="domain-bar-item">
                            <div className="domain-bar-header">
                              <span>Traditional Knowledge (TK)</span>
                              <span className="tag" style={{ background: tk.color }}>{tk.label}</span>
                            </div>
                            <div className="domain-progress-track">
                              <div className="domain-progress-fill" style={{ width: tk.width, background: tk.color }}></div>
                            </div>
                          </div>

                          <div className="domain-bar-item">
                            <div className="domain-bar-header">
                              <span>Access & Benefit Sharing (ABS)</span>
                              <span className="tag" style={{ background: abs.color }}>{abs.label}</span>
                            </div>
                            <div className="domain-progress-track">
                              <div className="domain-progress-fill" style={{ width: abs.width, background: abs.color }}></div>
                            </div>
                          </div>

                          <div className="domain-bar-item">
                            <div className="domain-bar-header">
                              <span>Intellectual Property (IP)</span>
                              <span className="tag" style={{ background: ip.color }}>{ip.label}</span>
                            </div>
                            <div className="domain-progress-track">
                              <div className="domain-progress-fill" style={{ width: ip.width, background: ip.color }}></div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header-row">
                    <div className="card-eyebrow">CONFIDENCE SCORE</div>
                    <div className="card-number">04</div>
                  </div>
                  <h3>Confidence</h3>
                  <div className="confidence">
                    {Math.round((typeof result.confidence?.score === "number" ? result.confidence.score : 0) * 100)}%
                  </div>
                  <strong>{toStr(result.confidence?.level || result.confidence?.label || "")}</strong>
                  <p className="muted">{toStr(result.confidence?.warning || result.confidence?.meaning || "Confidence is supplied by the backend evidence-analysis pipeline.")}</p>
                </div>
              </div>

              {/* EVIDENCE */}
              <div className="card">
                <div className="card-header-row">
                  <div className="card-eyebrow">EVIDENCE SOURCES</div>
                  <div className="card-number">05</div>
                </div>
                <h3>Retrieved Evidence</h3>
                {(!result.evidence || result.evidence.length === 0) ? (
                  <p className="muted">No evidence was retrieved.</p>
                ) : (
                  result.evidence.map((e, idx) => (
                    <article className="evidence" key={e.id || idx}>
                      <div className="evidence-top">
                        <strong>{toStr(e.title || e.source || e.id || `Evidence ${idx + 1}`)}</strong>
                        <span>{formatEvidenceScore(e.score)}</span>
                      </div>
                      <p>{toStr(e.text || "")}</p>
                      <small>
                        {toStr(e.source || "")} · {toStr(e.domain || "")}
                        {e.source_url && (
                          <>
                            {" · "}
                            <a href={e.source_url} target="_blank" rel="noreferrer">
                              Official source
                            </a>
                          </>
                        )}
                      </small>
                    </article>
                  ))
                )}
              </div>

              {/* VALIDATION */}
              {getValidationMessage(result) && (
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-eyebrow">SOURCE VALIDATION</div>
                    <div className="card-number">06</div>
                  </div>
                  <h3>Verification Status</h3>
                  <p className="muted">{getValidationMessage(result)}</p>
                </div>
              )}

              {/* ACTION PLAN */}
              <div className="card">
                <div className="card-header-row">
                  <div className="card-eyebrow">RECOMMENDED ACTION PLAN</div>
                  <div className="card-number">07</div>
                </div>
                <h3>Action Plan</h3>
                <ol>
                  {(result.action_plan || []).map((step, i) => (
                    <li key={i}>{toStr(step)}</li>
                  ))}
                </ol>
              </div>

              <div className="disclaimer">
                Prototype only — not legal advice, not a patentability
                determination, and not a substitute for qualified professional
                review.
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<LandingPage />} />
        <Route path="/features" element={<LandingPage />} />
        <Route path="/contact" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/app" element={<Dashboard />} />
      </Routes>
    </>
  );
}
