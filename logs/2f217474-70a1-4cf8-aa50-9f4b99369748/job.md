Copy the gccli skill from `.pi/skills/pi-skills/gccli` to `.pi/skills/gccli` and enhance it with detailed documentation on how to:
- Decode base64-encoded secrets from environment variables
- Parse the decoded JSON to extract individual credentials
- Prepare credentials for use with the gccli command

The enhanced skill should include practical examples and clear instructions so the agent understands the full credential workflow before attempting to use gccli. The skill in `.pi/skills/` will take precedence over the template version, ensuring this knowledge persists across fresh pulls.