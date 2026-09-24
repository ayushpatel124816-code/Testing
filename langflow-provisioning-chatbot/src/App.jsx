import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Copy,
  Database,
  FileJson,
  Firewall,
  Loader2,
  Network,
  RefreshCcw,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  XCircle
} from "lucide-react";
import { runProvisioningFlow } from "./langflow";

const initialForm = {
  hostname: "",
  ip: "",
  application: "",
  environment: "PRD",
  owner: "",
  region: "EMEA",
  country: "",
  zone: "CORE",
  pool: "",
  illumio_labels: ""
};

const steps = [
  "Collect server data",
  "Validate & reconcile",
  "Peer comparison",
  "Firewall target mapping",
  "Generate rules",
  "Verify & audit"
];

function App() {
  const [form, setForm] = useState(initialForm);
  const [messages, setMessages] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(
    () => form.hostname.trim() && form.ip.trim() && form.application.trim() && form.pool.trim(),
    [form]
  );

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetAll() {
    setForm(initialForm);
    setMessages([]);
    setResult(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit || loading) return;

    const serverDetails = {
      ...form,
      illumio_labels: form.illumio_labels
        ? form.illumio_labels.split(",").map((item) => item.trim()).filter(Boolean)
        : []
    };

    setLoading(true);
    setResult(null);

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: `Provision ${serverDetails.hostname} for ${serverDetails.application} / ${serverDetails.environment}`
      },
      {
        role: "assistant",
        text: "Running the provisioning workflow… I’ll validate the server, compare it with the peer configuration, map the firewall target, and return the final rules."
      }
    ]);

    try {
      const data = await runProvisioningFlow(
        serverDetails,
        `provision-${serverDetails.hostname}-${Date.now()}`
      );

      setResult(data);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.success
            ? "Validation completed successfully. The final provisioning JSON is ready."
            : data.error || "The workflow did not approve this provisioning request."
        }
      ]);
    } catch (error) {
      const message = error?.message || "Unable to reach Langflow.";
      setResult({ success: false, error: message });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: message
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={21} />
          </div>
          <div>
            <div className="brand-title">Provisioning</div>
            <div className="brand-subtitle">AI Security Copilot</div>
          </div>
        </div>

        <div className="connection-card">
          <div className="connection-top">
            <span className="status-dot" />
            <span>Langflow connected</span>
          </div>
          <div className="connection-text">
            Final rule generation is handled by your Langflow workflow.
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-label">Workflow</div>
          <div className="workflow-list">
            {steps.map((step, index) => (
              <div className="workflow-item" key={step}>
                <div className="step-number">{index + 1}</div>
                <span>{step}</span>
                {index < steps.length - 1 && <ChevronRight size={14} className="step-arrow" />}
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="mini-icon"><Activity size={15} /></div>
          <div>
            <strong>Automated provisioning</strong>
            <span>Peer validation + firewall mapping</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow"><Sparkles size={13} /> LANGFLOW ORCHESTRATION</div>
            <h1>Server Provisioning Chatbot</h1>
            <p>Enter the server details. Langflow performs reconciliation, peer comparison and target mapping.</p>
          </div>
          <button className="ghost-button" onClick={resetAll}>
            <RefreshCcw size={16} /> New request
          </button>
        </header>

        <div className="content-grid">
          <section className="panel request-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">REQUEST</span>
                <h2>Server details</h2>
              </div>
              <div className="icon-chip"><Server size={18} /></div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field-grid">
                <Field label="Hostname" required value={form.hostname} onChange={(v) => updateField("hostname", v)} placeholder="new-srv-01" />
                <Field label="IP address" required value={form.ip} onChange={(v) => updateField("ip", v)} placeholder="10.118.140.172" />
                <Field label="Application" required value={form.application} onChange={(v) => updateField("application", v)} placeholder="CORTEX FX" />
                <Field label="Pool" required value={form.pool} onChange={(v) => updateField("pool", v)} placeholder="CORTEX FX PRD" />
                <Field label="Environment" value={form.environment} onChange={(v) => updateField("environment", v)} placeholder="PRD" />
                <Field label="Owner" value={form.owner} onChange={(v) => updateField("owner", v)} placeholder="Application / team owner" />
                <Field label="Region" value={form.region} onChange={(v) => updateField("region", v)} placeholder="EMEA" />
                <Field label="Country" value={form.country} onChange={(v) => updateField("country", v)} placeholder="UK" />
                <Field label="Zone" value={form.zone} onChange={(v) => updateField("zone", v)} placeholder="CORE" />
                <Field label="Illumio labels" wide value={form.illumio_labels} onChange={(v) => updateField("illumio_labels", v)} placeholder="EMEA-IV1, PRD, CORE" />
              </div>

              <div className="submit-row">
                <div className="hint">
                  <Database size={14} />
                  Langflow receives the complete server profile as JSON.
                </div>
                <button className="primary-button" type="submit" disabled={!canSubmit || loading}>
                  {loading ? <><Loader2 className="spin" size={17} /> Running workflow…</> : <>Run provisioning <ArrowUpRight size={17} /></>}
                </button>
              </div>
            </form>

            <div className="chat-section">
              <div className="chat-header">
                <div>
                  <span className="panel-kicker">CHAT</span>
                  <h2>Workflow conversation</h2>
                </div>
                <div className="chat-badge"><CircleDot size={12} /> Live</div>
              </div>

              <div className="chat-window">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <div className="empty-icon"><Sparkles size={22} /></div>
                    <strong>Ready for provisioning</strong>
                    <span>Submit a server profile to start the Langflow workflow.</span>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div className={`message ${message.role}`} key={index}>
                      <div className="message-avatar">
                        {message.role === "user" ? <Server size={14} /> : <Sparkles size={14} />}
                      </div>
                      <div className="message-bubble">{message.text}</div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="message assistant">
                    <div className="message-avatar"><Sparkles size={14} /></div>
                    <div className="message-bubble loading-bubble">
                      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel result-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">FINAL OUTPUT</span>
                <h2>Provisioning result</h2>
              </div>
              {result && (
                <button className="icon-button" title="Copy JSON" onClick={copyResult}>
                  <Copy size={16} />
                </button>
              )}
            </div>

            {!result ? (
              <div className="result-empty">
                <div className="result-orbit">
                  <Network size={30} />
                </div>
                <h3>Nothing provisioned yet</h3>
                <p>Your Langflow response will appear here as three structured outputs.</p>
                <div className="output-preview">
                  <PreviewIcon icon={<ShieldCheck size={15} />} label="Illumio rule" />
                  <PreviewIcon icon={<Firewall size={15} />} label="Firewall rule" />
                  <PreviewIcon icon={<Terminal size={15} />} label="Firewall naming convention" />
                </div>
              </div>
            ) : result.success ? (
              <SuccessResult result={result} copied={copied} />
            ) : (
              <ErrorResult result={result} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required, wide }) {
  return (
    <label className={`field ${wide ? "field-wide" : ""}`}>
      <span>{label}{required && <b> *</b>}</span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function PreviewIcon({ icon, label }) {
  return (
    <div className="preview-item">
      <div>{icon}</div>
      <span>{label}</span>
    </div>
  );
}

function SuccessResult({ result, copied }) {
  return (
    <div className="result-content">
      <div className="success-banner">
        <div className="success-icon"><CheckCircle2 size={21} /></div>
        <div>
          <strong>Provisioning validation successful</strong>
          <span>Peer comparison and firewall target mapping completed.</span>
        </div>
        {copied && <span className="copied">Copied</span>}
      </div>

      <OutputCard
        icon={<ShieldCheck size={18} />}
        title="Illumio rule"
        subtitle="Security policy generated by the workflow"
        value={result.illumio_rule}
      />

      <OutputCard
        icon={<Firewall size={18} />}
        title="Firewall rule"
        subtitle="Firewall provisioning payload"
        value={result.firewall_rule}
      />

      <OutputCard
        icon={<Terminal size={18} />}
        title="Firewall naming convention"
        subtitle="Resolved target naming"
        value={result.firewall_naming_convention}
        compact
      />

      <details className="raw-details">
        <summary><FileJson size={15} /> View raw response</summary>
        <pre>{JSON.stringify(result.raw ?? result, null, 2)}</pre>
      </details>
    </div>
  );
}

function OutputCard({ icon, title, subtitle, value, compact }) {
  return (
    <div className="output-card">
      <div className="output-card-head">
        <div className="output-title">
          <div className="output-icon">{icon}</div>
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
        </div>
        <span className="json-tag">JSON</span>
      </div>
      <pre className={compact ? "compact-json" : ""}>{formatValue(value)}</pre>
    </div>
  );
}

function formatValue(value) {
  if (value == null) return "{}";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

function ErrorResult({ result }) {
  return (
    <div className="error-content">
      <div className="error-banner">
        <div className="error-icon"><XCircle size={23} /></div>
        <div>
          <strong>Provisioning failed</strong>
          <span>The Langflow workflow did not return a valid provisioning result.</span>
        </div>
      </div>

      <div className="error-box">
        <div className="error-box-title"><AlertCircle size={17} /> Workflow error</div>
        <p>{result.error || "Unknown workflow error."}</p>
      </div>

      {result.raw && (
        <details className="raw-details" open>
          <summary><FileJson size={15} /> View raw response</summary>
          <pre>{JSON.stringify(result.raw, null, 2)}</pre>
        </details>
      )}

      <div className="failure-note">
        <strong>No rules were presented as provisioned.</strong>
        <span>Resolve the validation/conflict reported by Langflow and run the request again.</span>
      </div>
    </div>
  );
}

export default App;
