# Daily Calendar Summary

This task generates a personalized daily calendar summary from Google Calendar and sends it to Telegram every weekday morning at 08:30 Berlin time.

## Overview

Your mission is to:
1. Extract Google Calendar credentials from the `SECRETS` environment variable
2. Authenticate with the Google Calendar API
3. Fetch today's events from three calendars:
   - **tilmanbaumann@gmail.com** (primary personal calendar)
   - **Family** (shared family calendar)
   - **VHS Waldeck-Frankenberg** (imported language school events — these are your wife's VHS courses)
4. Format a motivational daily summary with creative presentation
5. Send the summary as a Telegram message

## Step 1: Extract Credentials from SECRETS

The `SECRETS` environment variable contains a base64-encoded JSON with all protected credentials including Google Calendar OAuth tokens and Telegram bot token.

### Decode and Parse SECRETS

```bash
# Decode the base64-encoded SECRETS
SECRETS_JSON=$(echo "$SECRETS" | base64 -d)
echo "$SECRETS_JSON" | jq '.'
```

You should see a JSON object containing:
- `GCCLI_CREDS` (base64-encoded tar.gz of Google Calendar credentials)
- `TELEGRAM_BOT_TOKEN` (your Telegram bot token)
- `TELEGRAM_CHAT_ID` (your Telegram chat ID)
- Possibly other credentials

### Extract and Setup Google Calendar Credentials

```bash
# Extract the base64-encoded GCCLI_CREDS from SECRETS
GCCLI_CREDS_B64=$(echo "$SECRETS_JSON" | jq -r '.GCCLI_CREDS')

# Decode and extract to home directory
echo "$GCCLI_CREDS_B64" | base64 -d | tar xz -C ~

# Verify credentials are in place
ls -la ~/.gccli/
```

This will set up:
- `~/.gccli/credentials.json` — OAuth client credentials
- `~/.gccli/accounts.json` — Account tokens (if available)

### Extract Telegram Credentials

```bash
# Extract Telegram bot token and chat ID from SECRETS
TELEGRAM_BOT_TOKEN=$(echo "$SECRETS_JSON" | jq -r '.TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID=$(echo "$SECRETS_JSON" | jq -r '.TELEGRAM_CHAT_ID')

# Verify they're set
echo "Bot Token: ${TELEGRAM_BOT_TOKEN:0:20}... (hidden for security)"
echo "Chat ID: $TELEGRAM_CHAT_ID"
```

## Step 2: Fetch Today's Events Using gccli

Refer to the gccli skill documentation at `.pi/skills/gccli/SKILL.md` for detailed command reference.

### Basic Command Structure

```bash
gccli <email> events <calendarId> [--from <dt>] [--to <dt>]
```

### Fetch Events from Each Calendar

Today's date for filtering (use this format):
```bash
TODAY=$(date +%Y-%m-%d)
TOMORROW=$(date -d "tomorrow" +%Y-%m-%d)
START="${TODAY}T00:00:00"
END="${TOMORROW}T00:00:00"
```

#### Primary Calendar (tilmanbaumann@gmail.com)

```bash
EVENTS_PRIMARY=$(gccli tilmanbaumann@gmail.com events primary --from "$START" --to "$END")
echo "$EVENTS_PRIMARY"
```

#### Family Calendar

The Family calendar is usually a secondary calendar. First list available calendars:

```bash
CALENDARS=$(gccli tilmanbaumann@gmail.com calendars)
echo "$CALENDARS" | jq '.'
```

Find the calendar ID for "Family" (look for a calendar with "Family" in the summary), then fetch events:

```bash
FAMILY_CAL_ID="<calendar-id-from-above>"
EVENTS_FAMILY=$(gccli tilmanbaumann@gmail.com events "$FAMILY_CAL_ID" --from "$START" --to "$END")
echo "$EVENTS_FAMILY"
```

#### VHS Waldeck-Frankenberg Calendar

Similarly, find the VHS calendar ID:

```bash
VHS_CAL_ID="<vhs-calendar-id>"
EVENTS_VHS=$(gccli tilmanbaumann@gmail.com events "$VHS_CAL_ID" --from "$START" --to "$END")
echo "$EVENTS_VHS"
```

## Step 3: Parse and Organize Events

Create a Node.js script to parse the JSON output from gccli and organize events by type:

### Parse Events JSON

```javascript
// Example event structure from gccli
const event = {
  id: "abc123",
  summary: "Team Meeting",
  start: {
    dateTime: "2024-02-12T10:00:00" // or "date": "2024-02-12" for all-day
  },
  end: {
    dateTime: "2024-02-12T11:00:00"
  },
  description: "Weekly sync",
  location: "Conference Room"
};

// Check if all-day event
const isAllDay = !event.start.dateTime && event.start.date;

// For timed events, extract time
const startTime = new Date(event.start.dateTime).toLocaleTimeString('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});
```

### Organize by Type

Separate events into:
- **All-day events** — presented with narrative flourish
- **Timed events** — sorted by start time, presented as bullet points

## Step 4: Format the Daily Summary

### All-Day Events Section

Start with creative energy and narrative flourish. Example:

```
🌅 Today's Grand Plan

Ah, what a day ahead! You have some special occasions brewing:
• [Event 1 summary]
• [Event 2 summary]
```

### Timed Events Section

Organize chronologically, casual bullet points:

```
⏰ Your Schedule

08:00 – Gym session
10:30 – Team standup
14:00 – Client call
15:30 – 1:1 with Sarah
```

### Family/VHS Events Section

If there are events from the Family or VHS calendars, add a separate section:

```
👨‍👩‍👧 For the Family

📚 VHS Course: German B1 (14:00-16:00) — your wife's language class
🎉 Family dinner planning (19:00)
```

### Motivational Closing

End with an energized, motivational message about the day ahead. Examples:
- "You've got a packed but manageable day. Let's make every moment count! 🚀"
- "Great balance between focus work and collaboration today. Go crush it! 💪"
- "Lots of quality time with family and learning today. Embrace the variety! 🌟"

### Full Example Format

```
🌅 Today's Grand Plan – Monday, February 12th

Ah, what a day ahead! You've got a wonderful mix of productivity and personal time brewing. Let's dive in!

⏰ Your Schedule

08:30 – Standup meeting (engineering team)
10:00 – Product review with leadership
13:00 – Lunch break
14:00 – 1:1 with Alex
16:00 – Code review session

👨‍👩‍👧 For the Family

📚 VHS Waldeck-Frankenberg: German B1 Intermediate Course (15:00-17:00)
   Your wife is learning German this afternoon!

🚀 Your Vibe for Today

You've got a solid mix of collaborative work and deep focus time today. The afternoon includes your wife's language learning — great reminder to support her progress! Make every meeting count, stay present, and finish strong. You've got this! 💪
```

## Step 5: Send to Telegram

Use the Telegram Bot API to send the formatted message as HTML:

### Telegram Bot API Endpoint

```
POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage
```

### Message Payload

```javascript
const payload = {
  chat_id: TELEGRAM_CHAT_ID,
  text: dailySummary,
  parse_mode: 'HTML'
};

// Convert to JSON and send
const payloadJson = JSON.stringify(payload);
```

### Using curl

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": '"$TELEGRAM_CHAT_ID"',
    "text": "'"$(echo "$FORMATTED_SUMMARY" | jq -Rs .)"'",
    "parse_mode": "HTML"
  }' \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"
```

### Using Node.js/fetch

```javascript
const response = await fetch(
  `https://api.telegram.org/bot${botToken}/sendMessage`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formattedSummary,
      parse_mode: 'HTML'
    })
  }
);

const result = await response.json();
if (!result.ok) {
  console.error('Telegram API error:', result);
  throw new Error(`Failed to send message: ${result.description}`);
}
```

## Step 6: Error Handling

Implement graceful error handling at each step:

### Credential Extraction Errors

```bash
# Check if SECRETS is set
if [ -z "$SECRETS" ]; then
  echo "ERROR: SECRETS environment variable not set"
  exit 1
fi

# Verify base64 decoding
if ! SECRETS_JSON=$(echo "$SECRETS" | base64 -d 2>&1); then
  echo "ERROR: Failed to decode SECRETS from base64"
  exit 1
fi

# Verify JSON parsing
if ! echo "$SECRETS_JSON" | jq . > /dev/null 2>&1; then
  echo "ERROR: SECRETS is not valid JSON"
  exit 1
fi

# Check required fields
GCCLI_CREDS=$(echo "$SECRETS_JSON" | jq -r '.GCCLI_CREDS')
if [ -z "$GCCLI_CREDS" ] || [ "$GCCLI_CREDS" = "null" ]; then
  echo "ERROR: GCCLI_CREDS not found in SECRETS"
  exit 1
fi
```

### Google Calendar API Errors

```bash
# Check gccli command success
if ! gccli tilmanbaumann@gmail.com calendars > /tmp/calendars.json 2>&1; then
  echo "ERROR: Failed to authenticate with Google Calendar"
  cat /tmp/calendars.json
  exit 1
fi

# Handle empty calendar lists
CALENDAR_COUNT=$(jq 'length' /tmp/calendars.json)
if [ "$CALENDAR_COUNT" -eq 0 ]; then
  echo "WARNING: No calendars found for tilmanbaumann@gmail.com"
fi
```

### Event Fetching Errors

```bash
# Gracefully handle missing calendars
get_events() {
  local email=$1
  local cal_id=$2
  local start=$3
  local end=$4
  
  local events=$(gccli "$email" events "$cal_id" --from "$start" --to "$end" 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "WARNING: Could not fetch events for calendar $cal_id"
    echo "[]"  # Return empty array
  else
    echo "$events"
  fi
}
```

### Telegram Send Errors

```bash
# Verify Telegram credentials before sending
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ "$TELEGRAM_BOT_TOKEN" = "null" ]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN not found in SECRETS"
  exit 1
fi

if [ -z "$TELEGRAM_CHAT_ID" ] || [ "$TELEGRAM_CHAT_ID" = "null" ]; then
  echo "ERROR: TELEGRAM_CHAT_ID not found in SECRETS"
  exit 1
fi

# Check Telegram API response
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '...' \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage")

SUCCESS=$(echo "$RESPONSE" | jq -r '.ok')
if [ "$SUCCESS" != "true" ]; then
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.description')
  echo "ERROR: Failed to send Telegram message: $ERROR_MSG"
  exit 1
fi
```

## Complete Workflow

Here's the order of operations:

1. ✅ Decode and parse SECRETS environment variable
2. ✅ Extract Google Calendar credentials from SECRETS
3. ✅ Set up gccli credentials in `~/.gccli/`
4. ✅ Extract Telegram credentials from SECRETS
5. ✅ List available calendars to find calendar IDs
6. ✅ Fetch events from all three calendars for today
7. ✅ Parse and organize events by type (all-day vs timed)
8. ✅ Sort timed events by start time
9. ✅ Format summary with creative sections and motivational tone
10. ✅ Send formatted summary to Telegram using Bot API
11. ✅ Log completion with success/failure status

## Success Criteria

- ✅ All three calendars are queried successfully
- ✅ Events are presented in a clear, organized manner
- ✅ All-day events have creative narrative presentation
- ✅ Timed events are sorted chronologically
- ✅ Family/VHS events are clearly labeled and contextualized
- ✅ Motivational closing message is energized and personalized
- ✅ Telegram message is successfully delivered
- ✅ Error handling is comprehensive and helpful
- ✅ Execution completes within reasonable time

## Debugging

If the task fails:

1. **Check SECRETS is set**: `echo "$SECRETS" | head -c 50`
2. **Verify base64 decoding**: `echo "$SECRETS" | base64 -d | head -c 100`
3. **Test gccli**: `gccli tilmanbaumann@gmail.com calendars`
4. **Test Telegram**: Use a curl command to verify bot token works
5. **Check calendar IDs**: Make sure you're using correct IDs for Family and VHS calendars
6. **Monitor logs**: Check Docker logs for any errors: `docker logs <container>`

Happy scheduling! 🎯
