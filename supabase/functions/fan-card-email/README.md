# fan-card-email Edge Function

Sends fan card application form submissions to **support@themartinhenderson.org** via Resend (from noreply@themartinhenderson.org). No email to the user.

## Deploy (Supabase Dashboard)

1. **Edge Functions** → **Create a new function** → name: `fan-card-email`.
2. Paste the contents of `index.ts`.
3. Ensure secrets **RESEND_API_KEY** and optionally **ADMIN_EMAIL** are set (same as booking-email).
4. Deploy. URL: `https://cgmvzrjxkldxtkrydcdv.supabase.co/functions/v1/fan-card-email`

## Required fields (all validated)

fullName, dob, email, phone, address, city, state, country, zip, level, favoriteRole. heardVia is optional (can be empty).
