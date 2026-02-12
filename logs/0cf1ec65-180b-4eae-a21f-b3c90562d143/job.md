Add DAILY_CALENDAR cron job to operating_system/CRONS.json and create operating_system/DAILY_CALENDAR.md with detailed instructions.

CRONS.json update:
- Add a new cron entry named "DAILY_CALENDAR"
- Schedule: "30 8 * * 1-5" (weekdays at 08:30 Berlin time)
- Type: agent
- Job: reference to operating_system/DAILY_CALENDAR.md

Create operating_system/DAILY_CALENDAR.md with instructions to:
1. Extract Google Calendar credentials from the SECRETS environment variable (base64 decode, JSON parse)
2. Authenticate with Google Calendar API using the extracted credentials
3. Fetch today's events from three calendars:
   - tilmanbaumann@gmail.com (primary)
   - Family
   - VHS Waldeck-Frankenberg (imported) — note these are language school events for the user's wife
4. Format the daily summary as:
   - All-day events: Use a narrative flourish/creative intro
   - Timed events: Casual bullet points organized by time (earliest to latest)
5. Write a motivational, energized summary of the day ahead
6. Send the formatted summary as a Telegram message to the user

Include error handling for credential extraction and API calls. Reference the gccli skill documentation in .pi/skills/gccli/ for credential handling patterns.