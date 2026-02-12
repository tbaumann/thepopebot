# GitHub CLI Availability Check - Quick Summary

## ✅ Answers to Your Questions

### 1. Is GitHub CLI installed?

**YES** - `gh version 2.86.0` (released 2026-01-21)

```bash
$ gh --version
gh version 2.86.0 (2026-01-21)
https://github.com/cli/cli/releases/tag/v2.86.0
```

### 2. Current authentication state?

**NOT AUTHENTICATED** (in this test context)

```bash
$ gh auth status
You are not logged into any GitHub hosts. To log in, run: gh auth login
```

**Note:** This is expected. Authentication happens at job runtime via the `SECRETS` environment variable.

### 3. Is the CLI functional?

**YES** - The CLI is installed and ready to use. It's waiting for the `GH_TOKEN` environment variable to be set.

```bash
$ gh repo view
To get started with GitHub CLI, please run:  gh auth login
Alternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.
```

### 4. What's the current setup?

**Architecture:**
- GitHub CLI authenticates via `GH_TOKEN` environment variable
- Token is passed via GitHub Actions secret (`SECRETS`)
- `SECRETS` is base64-encoded JSON containing multiple credentials
- `entrypoint.sh` decodes and exports each credential as an environment variable
- LLM is protected from seeing these secrets via the `env-sanitizer` extension

**Token Flow:**
```
GitHub Secret (SECRETS) 
  → base64-encoded JSON 
  → entrypoint.sh decodes 
  → exports GH_TOKEN=xxx 
  → gh CLI uses it automatically
  → Git credentials configured via `gh auth setup-git`
```

### 5. Recommendations for secure token management?

#### ✅ Already Implemented (Good)
- ✅ Tokens stored in GitHub Actions secrets
- ✅ Base64 encoding prevents accidental logging
- ✅ LLM cannot access sensitive tokens (filtered by env-sanitizer)
- ✅ Tokens not baked into Docker image
- ✅ Git credentials configured automatically

#### ⚠️ Critical Fix Needed
- 🔴 **URGENT:** Replace `eval` in entrypoint.sh (line 17) - shell injection vulnerability
- 🔴 **HIGH:** Add validation to reject secrets with shell metacharacters

#### 📋 Current Implementation (VULNERABLE)
```bash
# entrypoint.sh line 17 - DO NOT USE
eval $(echo "$SECRETS_JSON" | jq -r 'to_entries | .[] | "export \(.key)=\"\(.value)\""')
```

#### ✅ Secure Implementation (RECOMMENDED)
```bash
# Safe parsing without eval
if [ -n "$SECRETS" ]; then
    SECRETS_JSON=$(printf '%s' "$SECRETS" | base64 -d)
    while IFS='=' read -r key value; do
        export "$key"="$value"
    done < <(printf '%s' "$SECRETS_JSON" | jq -r 'to_entries[] | "\(.key)=\(.value)"')
    export SECRETS="$SECRETS_JSON"
fi
```

#### 🔒 Best Practices to Follow
1. **Token Scoping:** Use GitHub PAT with minimal required scopes:
   - `repo` for private repositories
   - `public_repo` for public repositories only
   
2. **Token Rotation:** Rotate tokens regularly (every 90 days)

3. **Monitoring:** Log all `gh` API calls for rate limit tracking

4. **Validation:** Check token format before using:
   ```bash
   if [[ ! "$GH_TOKEN" =~ ^gh[ps]_[A-Za-z0-9_]{36,}$ ]]; then
       echo "Invalid GitHub token format"
       exit 1
   fi
   ```

5. **Error Handling:** Fail fast if token is invalid:
   ```bash
   gh auth status || { echo "GitHub authentication failed"; exit 1; }
   ```

---

## Quick Reference

| Item | Status | Notes |
|------|--------|-------|
| **GitHub CLI Version** | 2.86.0 | Latest stable |
| **Installation Path** | /usr/bin/gh | System-wide |
| **Auth Method** | `GH_TOKEN` env var | Recommended for CI/CD |
| **Current Auth** | Not set (test context) | Set at job runtime |
| **Security** | ⚠️ Needs fix | Shell injection in entrypoint.sh |

---

## Next Steps

1. **Immediate:** Fix the `eval` vulnerability in `entrypoint.sh`
2. **Test:** Verify the fix with malicious input
3. **Document:** Create token setup guide for users
4. **Monitor:** Add logging for GitHub API usage

See `/job/logs/github-cli-audit.md` for the full detailed report.
