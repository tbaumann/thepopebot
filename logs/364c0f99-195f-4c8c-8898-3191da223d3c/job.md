Check if the Google Calendar CLI (gccli) skill is available in thepopebot and test its functionality. Specifically:

1. Check if there's a gccli skill in the .pi/skills/ directory
2. If available, run `gccli --version` or `gccli --help` to see what functionality is provided
3. Try a basic command like listing calendars (this may fail due to no auth token, but will show if the skill is functional)
4. Document what Google Calendar operations are supported
5. Check what authentication method the skill expects (OAuth, service account, API key, etc.)
6. Provide recommendations for securely passing Google Calendar authentication credentials

The goal is to verify the gccli skill is available and understand how to properly authenticate it for Google Calendar access.