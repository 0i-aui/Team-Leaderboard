# Security Policy

## 🔐 Overview

Security is an important part of the Team Leaderboard project.

The application handles team members, rankings, points, activity history, notifications, and administrative operations. Security controls are therefore applied at both the application and database levels.

This project is currently under active development and should be considered experimental.

---

## 📌 Supported Versions

Since the project is currently under development, security support is focused on the latest version available in the main branch.

| Version | Supported |
|--------|-----------|
| Latest | ✅ Yes |
| Older versions | ❌ No |

---

## 🛡️ Security Principles

The project follows these general security principles:

- Least privilege
- Defense in depth
- Server-side authorization
- Database-level access control
- Input validation
- Secure handling of secrets
- Minimal data exposure
- Safe error handling
- Auditability of sensitive operations

Security controls should not rely solely on frontend restrictions.

---

## 🗄️ Database Security

The project uses Supabase/PostgreSQL.

Important security controls include:

### Row Level Security

Supabase Row Level Security (RLS) should be enabled on tables containing protected or sensitive data.

Database policies should explicitly define:

- Who can read data
- Who can insert data
- Who can update data
- Who can delete data

Frontend visibility must not be considered an authorization mechanism.

### Database Functions

Sensitive operations such as scoring and administrative actions should be protected at the database level.

Functions must be reviewed for:

- `EXECUTE` permissions
- `SECURITY DEFINER` usage
- `search_path` configuration
- Parameter validation
- Authorization checks
- Race conditions
- Privilege escalation

A function being inaccessible from the UI does not automatically make it secure.

---

## 🏆 Scoring Security

Leaderboard points are considered protected application data.

The backend/database must enforce:

- Authorized scoring operations
- Weekly scoring limits
- Valid point sources
- Valid member identifiers
- Valid point ranges
- Prevention of unauthorized score manipulation
- Race-condition-safe limit enforcement

Frontend validation alone is not sufficient.

An attacker should not be able to bypass the weekly limit simply by modifying a request or calling a database function directly.

---

## 👤 Roles and Authorization

The application uses role-based permissions such as:

- `MEMBER`
- `SUPERVISOR`
- `LEADER`
- `MOD`
- `ADMIN`

Roles are security-sensitive data.

The client must not be trusted to determine whether a user is authorized to perform a privileged operation.

Authorization decisions should be enforced server-side/database-side wherever possible.

Users must not be able to:

- Escalate their own role
- Assign privileged roles to themselves
- Modify another user's privileges
- Bypass administrative restrictions
- Modify protected leaderboard data without authorization

---

## 🔑 Secrets and Environment Variables

Sensitive credentials must never be committed to the repository.

Examples include:

- Supabase service-role keys
- Secret API keys
- VAPID private keys
- Database credentials
- Private signing keys
- Authentication secrets

Frontend applications may contain public Supabase configuration when the database is correctly protected by RLS and appropriate policies.

Server-side secrets must remain server-side.

### Environment Files

Local environment files should not be committed:

```text
.env
.env.local
.env.production

The repository should use an appropriate .gitignore.

If a secret is accidentally committed:

1. Revoke or rotate the affected credential.


2. Remove the secret from the repository.


3. Check Git history for additional exposure.


4. Replace the credential with a new one.


5. Review logs and dependent services where applicable.



Simply deleting the file from the latest commit is not enough.


---

🔔 Web Push Notifications

The notification system may use browser Push API functionality and VAPID credentials.

Security requirements include:

Never expose the VAPID private key to the client.

Never expose server-side notification credentials.

Store push subscriptions securely.

Validate subscription data.

Avoid allowing arbitrary users to send notifications.

Protect server-side notification endpoints.

Request notification permission only after an explicit user interaction.


The service worker should only perform the operations required by the application.


---

📦 File Uploads

If profile image or other file-upload functionality is enabled, uploaded files must be treated as untrusted input.

The application should validate:

File size

MIME type

File extension

File content where applicable

Storage path

Upload permissions


Recommended restrictions include:

Allow only required image formats.

Enforce a reasonable maximum file size.

Prevent executable file uploads.

Avoid trusting the filename supplied by the client.

Use controlled storage paths.

Apply appropriate Supabase Storage policies.


Uploaded content should never be assumed to be safe merely because the browser identifies it as an image.


---

🌐 Frontend Security

The frontend should follow common web security practices.

Areas reviewed during development include:

XSS

Unsafe HTML rendering

URL handling

Injection vulnerabilities

Sensitive data exposure

Client-side authorization assumptions

Unsafe third-party dependencies

Browser storage usage

Service worker behavior


User-controlled content should be escaped or safely rendered.

Avoid using unsafe HTML injection unless there is a documented and justified reason.


---

🧪 Input Validation

All externally controlled input should be considered untrusted.

Validation should be performed at appropriate boundaries, including:

Database functions

API/server endpoints

File uploads

Query parameters

Notification subscriptions

User-provided text


Client-side validation may improve user experience, but it must not be the only security control.


---

🚨 Error Handling

Production errors should not expose sensitive implementation details.

Avoid returning:

Database credentials

Service-role credentials

Internal secrets

Stack traces

SQL queries containing sensitive information

Internal infrastructure details


Errors should provide enough information for legitimate debugging without unnecessarily exposing internal implementation details.


---

🔄 Realtime Security

Supabase Realtime subscriptions must be reviewed to ensure users only receive data they are authorized to receive.

Realtime should not become an unintended data-exfiltration mechanism.

Sensitive tables and events should have appropriate access policies.


---

📜 Audit History

Leaderboard activity and administrative operations may be recorded in application history.

Historical records should be treated as audit information.

Security-sensitive history should not be editable by normal users.

Technical database/RPC implementation details should not be unnecessarily exposed through the public interface.


---

🌍 Public Read-Only Interface

The public leaderboard is intentionally designed to expose selected leaderboard information.

Public visibility does not mean that all database information should be publicly accessible.

Only the minimum required data should be exposed to the public application.

Examples of data that should not be unnecessarily exposed:

Internal credentials

Private database fields

Administrative secrets

Push notification credentials

Internal authorization information

Sensitive audit metadata



---

🧩 Dependency Security

Project dependencies should be kept reasonably up to date.

Security reviews should include:

npm audit

and review of:

Direct dependencies

Transitive dependencies

Known vulnerabilities

Unnecessary packages

Abandoned packages


Dependency updates should be tested before deployment.


---

🚀 Deployment Security

The application may be deployed through Vercel.

Deployment configuration should ensure that:

Production secrets are stored as environment variables.

Secrets are not included in client bundles.

Debug configuration is disabled in production where applicable.

Preview deployments do not unintentionally expose production secrets.

Server-side credentials remain server-side.

Security headers are configured where appropriate.



---

🧑‍💻 Security Testing

Security testing should include, where applicable:

Authentication & Authorization

Privilege escalation

IDOR

Unauthorized administrative operations

Role manipulation

Function permission abuse


Database

RLS bypass attempts

Unauthorized writes

Unauthorized reads

RPC abuse

Race conditions

Weekly scoring-limit bypasses


Web Application

XSS

Injection

CSRF where applicable

Open redirects

Unsafe URL handling

Information disclosure


Storage

Unauthorized uploads

Unauthorized reads

File-type bypasses

Oversized uploads

Path manipulation


Notifications

Unauthorized push subscription access

Notification endpoint abuse

VAPID secret exposure

Service worker security


Testing should be performed only against environments where the tester has permission.


---

🐛 Reporting a Vulnerability

If you discover a security vulnerability, please report it privately rather than publicly disclosing the issue immediately.

When reporting a vulnerability, include:

A clear description

Affected feature/component

Steps to reproduce

Expected behavior

Actual behavior

Potential security impact

Screenshots or logs if relevant

Suggested remediation, if available


Please do not include real passwords, API keys, private tokens, or other sensitive credentials in a report.


---

🚫 Responsible Disclosure

Please allow reasonable time for the issue to be investigated and fixed before publicly disclosing technical details.

Do not intentionally:

Destroy or modify production data

Access data belonging to other users

Steal credentials

Deploy malware

Perform denial-of-service attacks

Abuse notification systems

Attempt unauthorized access to third-party systems


Only test systems and environments for which you have explicit authorization.


---

📄 Security Changes

Security-related changes should be reviewed carefully before deployment.

Changes affecting any of the following should receive additional security review:

RLS policies

Database functions

Role permissions

Scoring logic

Storage policies

Notification infrastructure

Environment variables

Authentication/authorization

Realtime access

Server-side endpoints



---

⚠️ Project Status

Team Leaderboard is currently an experimental/development project.

Security controls are continuously being reviewed and improved.

Do not assume that the current development environment provides the same security guarantees as a fully audited production system.
