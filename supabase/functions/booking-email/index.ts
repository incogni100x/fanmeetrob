// Supabase Edge Function: booking-email
// Deploy via Supabase Dashboard → Edge Functions → Deploy.
// Set secret: RESEND_API_KEY (from resend.com). Use "from" domain you verified in Resend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEFAULT_ADMIN_EMAIL = "support@robthomas.world";
const REQUIRED_FIELDS = [
  "fullName",
  "email",
  "phone",
  "organization",
  "bookingFor",
  "sex",
  "occupation",
  "homeAddress",
  "city",
  "state",
  "zipcode",
  "nearestAirport",
  "preferredDate",
  "preferredTime",
  "location",
] as const;

type BookingPayload = Record<(typeof REQUIRED_FIELDS)[number], string>;

function buildEmailHtml(data: BookingPayload): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 14px; background:#fafafa; color:#3f3f46; font-weight:500; border:1px solid #e4e4e7; border-bottom:none; width:180px;">${escapeHtml(label)}</td>
      <td style="padding:10px 14px; border:1px solid #e4e4e7; border-bottom:none; color:#18181b;">${escapeHtml(value || "—")}</td>
    </tr>`;
  const lastRow = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 14px; background:#fafafa; color:#3f3f46; font-weight:500; border:1px solid #e4e4e7; width:180px;">${escapeHtml(label)}</td>
      <td style="padding:10px 14px; border:1px solid #e4e4e7; color:#18181b;">${escapeHtml(value || "—")}</td>
    </tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Request</title>
</head>
<body style="margin:0; padding:0; background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size:14px; line-height:1.5; color:#18181b;">
  <div style="max-width:600px; margin:0 auto; padding:24px;">
    <p style="margin:0 0 4px; font-size:13px; color:#71717a;">Booking</p>
    <h1 style="margin:0 0 8px; font-size:24px; font-weight:600;">General Booking Request</h1>
    <p style="margin:0 0 24px; font-size:14px; color:#71717a;">A new booking request was submitted from the website.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; border:1px solid #e4e4e7; border-radius:12px; overflow:hidden;">
      <tbody>
        ${row("Full Name", data.fullName)}
        ${row("Email", data.email)}
        ${row("Phone", data.phone)}
        ${row("Organization / Event Name", data.organization)}
        ${row("Booking For", data.bookingFor)}
        ${row("Sex", data.sex)}
        ${row("Occupation", data.occupation)}
        ${row("Home Address", data.homeAddress)}
        ${row("City", data.city)}
        ${row("State", data.state)}
        ${row("ZIP Code", data.zipcode)}
        ${row("Nearest Airport", data.nearestAirport)}
        ${lastRow("Preferred Date", data.preferredDate)}
      </tbody>
    </table>

    <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; border:1px solid #e4e4e7; border-radius:12px; overflow:hidden; margin-top:16px;">
      <tbody>
        ${row("Preferred Time", data.preferredTime)}
        ${lastRow("Location", data.location)}
      </tbody>
    </table>

    <p style="margin:24px 0 0; font-size:12px; color:#71717a;">— Rob Thomas · robthomas.world</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const missing = REQUIRED_FIELDS.filter((key) => {
    const v = body[key];
    return v === undefined || (typeof v === "string" && !v.trim());
  });
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: "Missing required fields", fields: missing }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const data: BookingPayload = {
    fullName: String(body.fullName ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    organization: String(body.organization ?? "").trim(),
    bookingFor: String(body.bookingFor ?? "").trim(),
    sex: String(body.sex ?? "").trim(),
    occupation: String(body.occupation ?? "").trim(),
    homeAddress: String(body.homeAddress ?? "").trim(),
    city: String(body.city ?? "").trim(),
    state: String(body.state ?? "").trim(),
    zipcode: String(body.zipcode ?? "").trim(),
    nearestAirport: String(body.nearestAirport ?? "").trim(),
    preferredDate: String(body.preferredDate ?? "").trim(),
    preferredTime: String(body.preferredTime ?? "").trim(),
    location: String(body.location ?? "").trim(),
  };

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("RESEND_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? DEFAULT_ADMIN_EMAIL;

  const html = buildEmailHtml(data);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "Booking Form <noreply@robthomas.world>",
      to: [adminEmail],
      subject: `Booking request from ${data.fullName}`,
      html,
    }),
  });

  const resBody = await res.text();
  if (!res.ok) {
    console.error("Resend error:", res.status, resBody);
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: resBody }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: "Booking request sent" }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
});
