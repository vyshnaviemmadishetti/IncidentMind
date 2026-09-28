import http from "node:http";
import { HindsightClient } from "@vectorize-io/hindsight-client";

const PORT = 3001;
const BANK_ID = process.env.HINDSIGHT_BANK_ID || "incidentmind-demo";

const client = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_BASE_URL,
  apiKey: process.env.HINDSIGHT_API_KEY,
});

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  try {

    if (req.method === "POST" && req.url === "/api/recall") {
      const body = await readBody(req);

      const query = body.query || "recent production incidents and successful fixes";

      const result = await client.recall(BANK_ID, query, { limit: 5 });

      return send(res, 200, {
        ok: true,
        memories: result,
      });
    }

    if (req.method === "POST" && req.url === "/api/retain") {

      const body = await readBody(req);

      await client.retain(
        BANK_ID,
        body.content || "Incident resolved successfully."
      );

      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && req.url === "/api/analyze") {
      const body = await readBody(req);

      const incident =
        body.incident || "Production incident requiring investigation.";

      const memories = await client.recall(
        BANK_ID,
        incident,
        { limit: 5 }
      );

      const reasoning = await client.reflect(
        BANK_ID,
        `Analyze this production incident using relevant past incidents from memory.

Current incident:
${incident}

Provide:
1. Likely root cause
2. Recommended actions
3. Relevant lessons from past incidents
4. Prevention steps`
      );

      return send(res, 200, {
        ok: true,
        incident,
        memories,
        reasoning,
      });
    }

    return send(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return send(res, 500, {
      ok: false,
      error: error.message,
    });
  }
});

server.listen(PORT, () => {
  console.log("IncidentMind backend running on http://localhost:" + PORT);
});
