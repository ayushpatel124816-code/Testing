# Langflow Provisioning Chatbot

A React/Vite frontend for a server provisioning Langflow workflow.

## What it does

1. Collects server provisioning details.
2. Sends the profile directly to your Langflow Flow API.
3. Expects the final workflow to return:
   - `illumio_rule`
   - `firewall_rule`
   - `firewall_naming_convention`
4. Renders successful output as three structured JSON cards.
5. If the workflow fails/mismatches, renders the returned error message instead of pretending provisioning succeeded.

## Setup

```bash
npm install
cp .env.example .env
```

Set:

```env
VITE_LANGFLOW_API_URL=https://YOUR-LANGFLOW-HOST/api/v1/run/YOUR_FLOW_ID
```

Optional:

```env
VITE_LANGFLOW_API_KEY=
```

Then:

```bash
npm run dev
```

Open the URL shown by Vite, normally `http://localhost:5173`.

## Payload sent to Langflow

The frontend sends a Langflow-style request:

```json
{
  "input_value": "{\"request_type\":\"server_provisioning\",\"server\":{\"hostname\":\"new-srv-01\", \"ip\":\"10.118.140.172\", \"application\":\"CORTEX FX\", \"environment\":\"PRD\", \"owner\":\"Team\", \"region\":\"EMEA\", \"country\":\"UK\", \"zone\":\"CORE\", \"pool\":\"CORTEX FX PRD\", \"illumio_labels\":[\"EMEA-IV1\",\"PRD\",\"CORE\"]}}",
  "input_type": "chat",
  "output_type": "chat",
  "session_id": "provision-new-srv-01-..."
}
```

## Expected final Langflow JSON

Success:

```json
{
  "success": true,
  "illumio_rule": {
    "source": "new-srv-01",
    "destination": "..."
  },
  "firewall_rule": {
    "action": "allow",
    "ports": [443]
  },
  "firewall_naming_convention": "EMEA_UK_PRD_CORE_APPL_MKT-ETS"
}
```

Failure:

```json
{
  "success": false,
  "error": "Peer mismatch: expected PRD but server is tagged STG."
}
```

The response parser also handles common Langflow wrappers and JSON embedded inside a text/markdown response.

## Important production note

If Langflow requires an API key, a browser-side `VITE_LANGFLOW_API_KEY` is visible to users. For production, put a small server-side proxy in front of Langflow and keep the key there. The UI itself can remain unchanged; only `runProvisioningFlow()` needs to call your proxy.
