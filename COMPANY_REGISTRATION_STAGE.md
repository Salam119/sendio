# Sendio verified company registration

This stage sends the 6-digit code to the official BCE email, creates the Supabase Auth user after successful verification, creates a verified company row, starts the user session, and redirects to `/dashboard/company`.

Required private environment variables are listed in `company-registration.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SMTP_PASSWORD` in browser code or commit them to Git.

The current BCE lookup uses the local Python/SQLite registration index. Test this stage locally before production deployment.
