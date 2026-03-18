# meet-and-greet-email Edge Function

Sends meet & greet form submissions to **support@themartinhenderson.org** via Resend (from noreply@themartinhenderson.org). No email to the user.

## Deploy (Supabase Dashboard)

1. **Edge Functions** → **Create a new function** → name: `meet-and-greet-email`.
2. Paste the contents of `index.ts`.
3. Ensure secrets **RESEND_API_KEY** and optionally **ADMIN_EMAIL** are set (same as booking-email).
4. Deploy. URL: `https://cgmvzrjxkldxtkrydcdv.supabase.co/functions/v1/meet-and-greet-email`

## Required fields (all validated)

Contact: fullName, email, phone, organization, bookingFor, sex, occupation, homeAddress, city, state, zipcode, nearestAirport.  
Event: preferredDates, preferredDatesEnd, preferredTime, location, attendees, duration, eventType, eventTypeOther, photoOps, autographs, qaSession, specialRequests, package.
