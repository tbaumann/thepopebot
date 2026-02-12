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

The credtials are provided in the LLM_SECRET named GCCLI_CREDS, prepare them for thepopebot:

```bash
echo $GCCLI_CREDS| base64 -d|tar xz -C ~
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

## Agent Usage:  Using Credentials

### When the Agent Runs

The agent (LLM) can access credentials from `LLM_SECRETS`. Here's how to work with them:

If your credentials are stored as `LLM_SECRETS` they will be provided in your ENV:

```bash
echo $GCCLI_CREDS| base64 -d|tar xz -C ~
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
