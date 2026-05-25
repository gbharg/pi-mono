# Curogram Auth

Cookie-based session. No bearer tokens. CSRF via `XSRF-TOKEN` cookie echoed back as `X-XSRF-TOKEN` header (Angular convention).

## Required headers on every authenticated call

```
X-Curogram-Frontend: web
X-XSRF-TOKEN: <value of XSRF-TOKEN cookie>
Cookie: <full cookie string>
Content-Type: application/json
Accept: application/json
```

## Login flow (3 mutations on `api-v2.curogram.com/graphql`)

1. **Submit credentials**

   ```graphql
   mutation Login($email: Email!, $password: String!, $source: LoginPage!) {
     login(email: $email, password: $password, source: $source) {
       ... on MfaListSchema {
         mfa { title send id }
         challenge { value expiresAt }
       }
       ... on ProviderTokenSchema {
         expiresAt
         accountId
       }
     }
   }
   ```

   - `source` is the page enum (e.g. `"PROVIDER"`).
   - If MFA enabled, response is `MfaListSchema` (list of available factors). Otherwise `ProviderTokenSchema` and you're logged in.

2. **Trigger OTP** (if MFA)

   ```graphql
   mutation SendOtp($mfaId: MfaId!, $challenge: Challenge!) {
     sendOtp(mfaId: $mfaId, challenge: $challenge) { expiresAt }
   }
   ```

   Pass the `mfa.id` of the chosen factor and the `challenge.value` from step 1.

3. **Submit OTP**

   ```graphql
   mutation LoginByCode($mfaId: MfaId!, $challenge: Challenge!, $code: Otp!) {
     loginByCode(mfaId: $mfaId, challenge: $challenge, code: $code) {
       expiresAt
       accountId
     }
   }
   ```

After a successful login the server sets the session cookies. Save them all.

## Session checks / utility

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/authenticate/current-session` | Returns the current session record. 200 = good. |
| `POST` | `/authenticate/one-time-token` | Generates a one-time token (for telemedicine link, etc.). |
| `PUT` | `/authenticate/practice/{practiceId}` | Switch active practice tenant (multi-practice accounts). |

## Password management

- `mutation ChangePassword`, `mutation SendChangePassword`, `mutation SetPassword`
- REST fallback: `POST /change-password/`

## Account management

```
POST /accounts/add-email                # add new email factor
POST /accounts/add-phone                # add new phone factor
POST /accounts/remove/email
POST /accounts/remove/phone
POST /accounts/verification/email       # send verification email
POST /accounts/verification/phone       # send verification SMS
POST /accounts/merge                    # merge two accounts
```

## Operating policy

Per Anthropic safety rules, Claude **must not** type the user's Curogram password into the login form. The accepted pattern is:

1. Ask the user to sign in interactively at `https://app.curogram.com`.
2. Pull the cookies from the active Chrome session via the Chrome MCP, or have the user paste the `Cookie` header from DevTools.
3. Persist the cookie + xsrf in a local secrets store (`op` / `bw`) and read at runtime.

If the script needs unattended re-login, drive the OAuth/SSO factor or a Curogram service account, not the human's password.
