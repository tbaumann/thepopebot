---
name: gccli
description: Google Calendar CLI for listing calendars, viewing/creating/updating events, and checking availability.
---

# Google Calendar CLI

Command-line interface for Google Calendar operations.

## Installation

```bash
npm install -g @mariozechner/gccli
```

## Understanding Credentials in thepopebot

### How Credentials Work

In thepopebot's architecture, credentials are passed securely through the Docker Agent via base64-encoded JSON environment variables. This ensures sensitive data is not exposed in git history or logs.

There are two credential streams:

1. **`SECRETS`** - Protected credentials (filtered from LLM's bash subprocess)
   - Example: `ANTHROPIC_API_KEY`, `GH_TOKEN`, database passwords
   - The LLM cannot access these via `echo $VARIABLE`

2. **`LLM_SECRETS`** - Credentials the LLM can access (NOT filtered)
   - Example: Google OAuth tokens, browser login credentials, skill API keys
   - The LLM can use these in commands and scripts

### The Credential Flow (What Happens Behind the Scenes)

1. **Encoding** - An admin encodes credentials as base64 JSON:
   ```bash
   SECRETS=$(echo -n '{"ANTHROPIC_API_KEY":"sk-ant-xxx","GH_TOKEN":"ghp_xxx"}' | base64)
   # Result: U0VDUkVUUz1lWEpoYkd3... (base64-encoded string)
   ```

2. **Transport** - The encoded `SECRETS` variable is passed to the Docker container via GitHub Actions

3. **Decoding** - entrypoint.sh decodes and exports each credential:
   ```bash
   # entrypoint.sh does this:
   SECRETS_JSON=$(echo "$SECRETS" | base64 -d)
   # Result: {"ANTHROPIC_API_KEY":"sk-ant-xxx","GH_TOKEN":"ghp_xxx"}
   
   # Then exports each key:
   export ANTHROPIC_API_KEY="sk-ant-xxx"
   export GH_TOKEN="ghp_xxx"
   ```

4. **Filtering** - The `env-sanitizer` extension prevents the LLM from accessing protected secrets in bash

5. **Usage** - Commands can safely reference these variables without exposure risk

---

## Setup

### Initial Setup (One-Time, Admin Task)

Google Calendar requires OAuth credentials that are set up once and then stored as LLM-accessible secrets.

#### Step 1: Google Cloud Console Setup

1. [Create a new project](https://console.cloud.google.com/projectcreate) (or select existing)
2. [Enable the Google Calendar API](https://console.cloud.google.com/apis/api/calendar-json.googleapis.com)
3. [Set app name](https://console.cloud.google.com/auth/branding) in OAuth branding
4. [Add test users](https://console.cloud.google.com/auth/audience) (all Gmail addresses you want to use)
5. [Create OAuth client](https://console.cloud.google.com/auth/clients):
   - Click "Create Client"
   - Application type: "Desktop app"
   - Download the JSON file

#### Step 2: Prepare Credentials

After downloading the OAuth credentials JSON from Google Cloud Console, prepare them for thepopebot:

```bash
# 1. Read the credentials file
cat ~/path/to/oauth-credentials.json

# 2. Encode the entire JSON as base64
LLM_SECRETS=$(cat ~/path/to/oauth-credentials.json | jq -c . | base64)
echo $LLM_SECRETS

# 3. Add to GitHub repository variables/secrets
# Settings → Secrets and variables → Actions → Variables
# Variable name: LLM_SECRETS
# Variable value: (paste the base64 string)
```

#### Step 3: Understand Your Credentials Structure

Google OAuth credentials JSON looks like:
```json
{
  "type": "service_account" OR "oauth2",
  "project_id": "my-project",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "user@my-project.iam.gserviceaccount.com",
  "client_id": "123456789.apps.googleusercontent.com",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/..."
}
```

---

## Agent Usage: Decoding and Using Credentials

### When the Agent Runs

The agent (LLM) can access credentials from `LLM_SECRETS`. Here's how to work with them:

### Pattern 1: Direct Environment Variable Access

If your credentials are stored as `LLM_SECRETS`:

```bash
# The environment variable is already available
echo $LLM_SECRETS
# Output: eyJ0eXBlIjoib2F1dGgyIiwgInByb2plY3RfaWQiOi4uLn0= (base64)

# Decode it
CREDS=$(echo "$LLM_SECRETS" | base64 -d)
echo "$CREDS"
# Output: {"type":"oauth2", "project_id":"..."}
```

### Pattern 2: Extract Specific Credentials with jq

Once decoded, use `jq` to extract specific fields:

```bash
# Decode the credentials
CREDS=$(echo "$LLM_SECRETS" | base64 -d)

# Extract individual fields
PROJECT_ID=$(echo "$CREDS" | jq -r '.project_id')
CLIENT_ID=$(echo "$CREDS" | jq -r '.client_id')
CLIENT_EMAIL=$(echo "$CREDS" | jq -r '.client_email')

echo "Project ID: $PROJECT_ID"
echo "Client Email: $CLIENT_EMAIL"
```

### Pattern 3: Save Credentials to File for gccli

gccli expects credentials as a JSON file. Here's how to set it up:

```bash
#!/bin/bash

# 1. Decode the base64-encoded credentials from environment
CREDS=$(echo "$LLM_SECRETS" | base64 -d)

# 2. Save to a temporary file that gccli can read
CREDS_FILE="/tmp/gccli-credentials.json"
echo "$CREDS" > "$CREDS_FILE"

# 3. Verify the file is valid JSON
jq . "$CREDS_FILE" > /dev/null || { echo "Invalid credentials JSON"; exit 1; }

# 4. Register credentials with gccli (one-time per session)
gccli accounts credentials "$CREDS_FILE"

# 5. List available accounts
gccli accounts list

# 6. Now use gccli normally with your email
gccli your-email@gmail.com calendars
```

### Pattern 4: Complete Workflow with gccli

```bash
#!/bin/bash
set -e

# Step 1: Decode credentials from environment
CREDS=$(echo "$LLM_SECRETS" | base64 -d)
CREDS_FILE="/tmp/gccli-credentials.json"
echo "$CREDS" > "$CREDS_FILE"

# Step 2: Extract the email address from credentials
EMAIL=$(echo "$CREDS" | jq -r '.client_email // .email')

# Step 3: Register with gccli
gccli accounts credentials "$CREDS_FILE"

# Step 4: Verify account was added (may need --manual flag for OAuth)
gccli accounts add "$EMAIL" 2>/dev/null || gccli accounts add "$EMAIL" --manual

# Step 5: Check setup
echo "Checking gccli setup..."
gccli accounts list

# Step 6: List calendars
echo "Listing calendars..."
gccli "$EMAIL" calendars

# Step 7: Get upcoming events (next 7 days)
echo "Upcoming events..."
gccli "$EMAIL" events primary \
  --from "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --to "$(date -u -d '+7 days' +%Y-%m-%dT%H:%M:%SZ)"
```

---

## Troubleshooting Credential Issues

### Problem: "Invalid base64"

```bash
# Check if LLM_SECRETS is set
echo "$LLM_SECRETS"

# If empty, it wasn't provided. Use SECRETS instead (if available)
# or ask the user to provide it
```

**Solution**: Ensure `LLM_SECRETS` was set in GitHub repository variables before the job ran.

### Problem: "Invalid JSON after decoding"

```bash
# Check what was decoded
DECODED=$(echo "$LLM_SECRETS" | base64 -d)
echo "$DECODED"

# Validate with jq
echo "$DECODED" | jq . || echo "Invalid JSON"
```

**Solution**: The encoded base64 may be corrupted. Ask admin to re-encode credentials.

### Problem: "gccli: command not found"

```bash
# Install gccli
npm install -g @mariozechner/gccli

# Verify installation
gccli --version
```

**Solution**: Run the installation command before attempting to use gccli.

### Problem: "Authentication failed" or "Invalid credentials"

```bash
# Verify credentials file is correct
cat /tmp/gccli-credentials.json | jq .

# Check if the email address matches the credentials
# Try manual OAuth setup
gccli accounts add your-email@gmail.com --manual
```

**Solution**: Make sure the credentials JSON is valid and the email matches. Some credentials may require manual OAuth setup.

---

## Usage

Run `gccli --help` for full command reference.

Common operations:
- `gccli <email> calendars` - List all calendars
- `gccli <email> events <calendarId> [--from <dt>] [--to <dt>]` - List events
- `gccli <email> event <calendarId> <eventId>` - Get event details
- `gccli <email> create <calendarId> --summary <s> --start <dt> --end <dt>` - Create event
- `gccli <email> freebusy <calendarIds> --from <dt> --to <dt>` - Check availability

Use `primary` as calendarId for the main calendar.

## Date/Time Format

- Timed events: `YYYY-MM-DDTHH:MM:SSZ` (UTC) or `YYYY-MM-DDTHH:MM:SS` (local)
- All-day events: `YYYY-MM-DD` with `--all-day` flag

## Data Storage

- `~/.gccli/credentials.json` - OAuth client credentials
- `~/.gccli/accounts.json` - Account tokens

---

## Quick Reference: Environment Variable Patterns

| Task | Command |
|------|---------|
| Check if credentials exist | `echo $LLM_SECRETS` |
| Decode base64 credentials | `echo "$LLM_SECRETS" \| base64 -d` |
| Validate decoded JSON | `echo "$LLM_SECRETS" \| base64 -d \| jq .` |
| Extract project ID | `echo "$LLM_SECRETS" \| base64 -d \| jq -r '.project_id'` |
| Save to file | `echo "$LLM_SECRETS" \| base64 -d > /tmp/creds.json` |
| Set up gccli from LLM_SECRETS | `gccli accounts credentials <(echo "$LLM_SECRETS" \| base64 -d)` |

---

## Example Job: List All Calendar Events

Here's a complete example job that lists all events:

```bash
#!/bin/bash
set -e

echo "=== Google Calendar Event Listing ==="

# Decode credentials
CREDS=$(echo "$LLM_SECRETS" | base64 -d)
CREDS_FILE="/tmp/gccli-creds.json"
echo "$CREDS" > "$CREDS_FILE"

# Extract email
EMAIL=$(echo "$CREDS" | jq -r '.client_email')

# Register with gccli
gccli accounts credentials "$CREDS_FILE"
gccli accounts add "$EMAIL" 2>/dev/null || true

# List calendars
echo "Calendars:"
gccli "$EMAIL" calendars

# Get events from the last 30 days
START=$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo -e "\nEvents (last 30 days):"
gccli "$EMAIL" events primary --from "$START" --to "$END"
```

When called as a job, this would:
1. Decode the base64 credentials
2. Extract the email address
3. Set up gccli
4. List all calendars and recent events
