// Supabase Edge Function: report-scam-email
// Deploy via Supabase Dashboard. Secrets: RESEND_API_KEY, optional ADMIN_EMAIL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEFAULT_ADMIN_EMAIL = "support@robthomas.world";
const REQUIRED_FIELDS = ["platform", "handle", "details"] as const;
const OPTIONAL_FIELDS = ["name", "email", "amount"] as const;

type Payload = Record<(typeof REQUIRED_FIELDS)[number], string> &
  Partial<Record<(typeof OPTIONAL_FIELDS)[number], string>>;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function row(label: string, value: string, last = false) {
  const border = last ? "" : " border-bottom:none;";
  return `
  <tr>
    <td style="padding:10px 14px; background:#fafafa; color:#3f3f46; font-weight:500; border:1px solid #e4e4e7;${border} width:180px;">${escapeHtml(label)}</td>
    <td style="padding:10px 14px; border:1px solid #e4e4e7;${border} color:#18181b;">${escapeHtml(value || "—")}</td>
  </tr>`;
}

function buildEmailHtml(data: Payload): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Scam Report</title></head>
<body style="margin:0; padding:0; background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size:14px; line-height:1.5; color:#18181b;">
  <div style="max-width:600px; margin:0 auto; padding:24px;">
    <p style="margin:0 0 4px; font-size:13px; color:#71717a;">Report Scam</p>
    <h1 style="margin:0 0 8px; font-size:24px; font-weight:600;">Impersonation / Scam Report</h1>
    <p style="margin:0 0 24px; font-size:14px; color:#71717a;">A new scam report was submitted from the website.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; border:1px solid #e4e4e7; border-radius:12px; overflow:hidden;">
      <tbody>
        ${row("Name", data.name ?? "")}
        ${row("Contact email", data.email ?? "")}
        ${row("Platform", data.platform)}
        ${row("Account / handle", data.handle)}
        ${row("Amount requested", data.amount ?? "")}
        ${row("What happened?", data.details, true)}
      </tbody>
    </table>

    <p style="margin:24px 0 0; font-size:12px; color:#71717a;">— Rob Thomas · robthomas.world</p>
  </div>
</body>
</html>`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const missing = REQUIRED_FIELDS.filter((key) => {
    const v = body[key];
    if (v === undefined) return true;
    return typeof v === "string" && !v.trim();
  });
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: "Missing required fields", fields: missing }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const data: Payload = {
    platform: String(body.platform ?? "").trim(),
    handle: String(body.handle ?? "").trim(),
    details: String(body.details ?? "").trim(),
  };
  OPTIONAL_FIELDS.forEach((key) => {
    const v = body[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      (data as Record<string, string>)[key] = String(v).trim();
    }
  });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? DEFAULT_ADMIN_EMAIL;
  const html = buildEmailHtml(data);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: "Report Scam <noreply@robthomas.world>",
      to: [adminEmail],
      subject: `Scam report: ${data.platform} – ${data.handle}`,
      html,
    }),
  });

  const resBody = await res.text();
  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: resBody }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: "Report sent" }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
});
