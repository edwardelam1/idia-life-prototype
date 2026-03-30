# Fix Authentication & Password Reset Issues

## Problems Identified

1. **"Load failed" on account creation**: The `signUp` call uses `emailRedirectTo: window.location.origin` which triggers a network request to the redirect URL during signup. In the preview sandbox, this fetch can fail, producing "Load failed." The account gets created in Supabase but the error surfaces in the UI.
2. **Login fails after signup**: Supabase requires email confirmation by default. The account exists but is unconfirmed, so `signInWithPassword` returns "Invalid login credentials." The signup flow should tell the user to confirm their email first, but the error message is misleading.
3. **Password reset security hole (critical)**: The reset-password edge function builds a broken `redirectTo` URL (`[https://zxyngqciipcvveigrzqt.lovableproject.com/auth?mode](https://zxyngqciipcvveigrzqt.lovableproject.com/auth?mode)  
  
Ensure users cannot access their account without authentication. There's no reason I could get to the wallet without verifying the email and setting a new password
  &nbsp;