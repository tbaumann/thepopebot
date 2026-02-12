Check if the GitHub CLI (gh) is available in the thepopebot environment and test its basic functionality. Specifically:

1. Run `gh --version` to check if it's installed
2. Run `gh auth status` to check current authentication state
3. Try a basic command like `gh repo view` (this should fail due to no auth, but will show if the CLI is functional)
4. Document what version is available and what the current setup looks like
5. Provide recommendations for securely passing an auth token

The goal is to verify the CLI is available and understand the current authentication setup before advising on secure token management.