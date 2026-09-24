const API_URL = import.meta.env.VITE_LANGFLOW_API_URL;
const API_KEY = import.meta.env.VITE_LANGFLOW_API_KEY;
const INPUT_TYPE = import.meta.env.VITE_LANGFLOW_INPUT_TYPE || "chat";
const OUTPUT_TYPE = import.meta.env.VITE_LANGFLOW_OUTPUT_TYPE || "chat";

function buildHeaders() {
  const headers = {
    "Content-Type": "application/json"
  };

  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }

  return headers;
}

export async function runProvisioningFlow(serverDetails, sessionId) {
  if (!API_URL) {
    throw new Error(
      "Langflow API URL is not configured. Copy .env.example to .env and set VITE_LANGFLOW_API_URL."
    );
  }

  const inputValue = JSON.stringify({
    request_type: "server_provisioning",
    server: serverDetails
  });

  const payload = {
    input_value: inputValue,
    input_type: INPUT_TYPE,
    output_type: OUTPUT_TYPE
  };

  if (sessionId) {
    payload.session_id = sessionId;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  const rawText = await response.text();

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { raw: rawText };
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      data?.error ||
      rawText ||
      `Langflow request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return normalizeLangflowResponse(data);
}

function normalizeLangflowResponse(data) {
  // Langflow can return different wrapper shapes depending on flow/output
  // configuration. We recursively collect likely text/object payloads.
  const candidates = [
    data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text,
    data?.outputs?.[0]?.outputs?.[0]?.results?.message,
    data?.outputs?.[0]?.outputs?.[0]?.results,
    data?.outputs?.[0]?.outputs?.[0]?.artifacts?.message,
    data?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message,
    data?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.text,
    data?.outputs?.[0]?.outputs?.[0]?.message,
    data?.outputs?.[0]?.outputs?.[0],
    data?.result,
    data?.output,
    data
  ];

  for (const candidate of candidates) {
    const parsed = parseProvisioningPayload(candidate);
    if (parsed) return parsed;
  }

  return {
    success: false,
    error: "Langflow returned a response, but no provisioning JSON could be identified.",
    raw: data
  };
}

function parseProvisioningPayload(value) {
  if (value == null) return null;

  if (typeof value === "object") {
    // Direct final JSON.
    if (
      "illumio_rule" in value ||
      "firewall_rule" in value ||
      "firewall_naming_convention" in value
    ) {
      return {
        success: value.success !== false && !value.error,
        illumio_rule: value.illumio_rule,
        firewall_rule: value.firewall_rule,
        firewall_naming_convention:
          value.firewall_naming_convention ?? value.firewall_name,
        error: value.error ?? value.message,
        raw: value
      };
    }

    // Some flows put the final object inside a text field.
    for (const key of ["text", "message", "output", "result", "content", "data"]) {
      if (key in value) {
        const parsed = parseProvisioningPayload(value[key]);
        if (parsed) return parsed;
      }
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Try the entire string as JSON.
    try {
      return parseProvisioningPayload(JSON.parse(trimmed));
    } catch {}

    // Try extracting a JSON object embedded in markdown/text.
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced) {
      try {
        return parseProvisioningPayload(JSON.parse(fenced[1]));
      } catch {}
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return parseProvisioningPayload(JSON.parse(trimmed.slice(start, end + 1)));
      } catch {}
    }

    // If the flow returned a plain error message.
    if (/error|failed|fail|mismatch|conflict|invalid/i.test(trimmed)) {
      return { success: false, error: trimmed, raw: value };
    }
  }

  return null;
}
