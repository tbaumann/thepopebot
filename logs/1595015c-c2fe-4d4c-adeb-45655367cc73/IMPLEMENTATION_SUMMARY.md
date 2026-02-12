# Implementation Summary: Git Submodule for pi-skills

## Objective
Implement proper skill discovery for thepopebot by using git submodules instead of runtime cloning, ensuring cleaner git history, easier updates, and proper integration with Pi's skill discovery system.

## Changes Made

### 1. Added pi-skills as Git Submodule
```bash
git submodule add https://github.com/badlogic/pi-skills.git .pi/skills/pi-skills
```

**Result:**
- `.gitmodules` file created
- `.pi/skills/pi-skills/` directory added (tracked by commit hash)
- Submodule points to commit: `75d32a382b0c8aafce356d68e17d2dc94c0c953b`

### 2. Updated Dockerfile

**Removed:**
```dockerfile
# Clone pi-skills and install browser-tools (includes Puppeteer + Chromium)
RUN git clone https://github.com/badlogic/pi-skills.git /pi-skills
WORKDIR /pi-skills/browser-tools
RUN npm install
WORKDIR /pi-skills/brave-search
RUN npm install
```

**Replaced with:**
```dockerfile
# Note: pi-skills is managed as a git submodule at .pi/skills/pi-skills
# Skills are installed at container runtime after repo clone (see entrypoint.sh)
```

**Benefits:**
- Smaller Docker image (npm deps installed at runtime, not build time)
- No hardcoded git clone during build
- Skills come from the repository's submodule tracking

### 3. Updated entrypoint.sh

**Changed clone command:**
```bash
# Before
git clone --single-branch --branch "$BRANCH" --depth 1 "$REPO_URL" /job

# After
git clone --single-branch --branch "$BRANCH" --depth 1 --recurse-submodules "$REPO_URL" /job
```

**Removed symlink hack:**
```bash
# Before
ln -sf /pi-skills/brave-search /job/.pi/skills/brave-search

# After (removed - no longer needed)
```

**Added runtime npm install:**
```bash
# Install npm dependencies for pi-skills that need them
echo "Installing pi-skills dependencies..."
if [ -d "/job/.pi/skills/pi-skills/browser-tools" ]; then
    (cd /job/.pi/skills/pi-skills/browser-tools && npm install --silent)
fi
if [ -d "/job/.pi/skills/pi-skills/brave-search" ]; then
    (cd /job/.pi/skills/pi-skills/brave-search && npm install --silent)
fi
```

### 4. Updated GitHub Actions Workflows

**Modified workflows:**
- `.github/workflows/docker-build.yml`
- `.github/workflows/update-event-handler.yml`

**Added to checkout steps:**
```yaml
- uses: actions/checkout@v4
  with:
    submodules: true  # ← Added this
```

**Why:** Ensures Docker builds and notification webhooks have access to submodule files.

### 5. Documentation Created

**New file:** `docs/SUBMODULES.md`
- Comprehensive guide to submodule management
- Explanation of build vs. runtime installation
- Update procedures
- Troubleshooting guide

**Updated:** `docs/CUSTOMIZATION.md`
- Added section listing all available skills
- Explained custom vs. submodule skills
- Linked to SUBMODULES.md for details

### 6. Cleanup

**Removed:**
- Old symlink: `.pi/skills/brave-search` (was pointing to `/pi-skills/brave-search`)

## Testing

Created and executed `tmp/test-skill-discovery.sh`:

**Results:**
```
✓ SUCCESS: All 10 skills discovered (2 custom + 8 from pi-skills)
```

**Skills discovered:**
- **Custom (2):** llm-secrets, modify-self
- **Submodule (8):** browser-tools, brave-search, gccli, gdcli, gmcli, transcribe, vscode, youtube-transcript

## Benefits of This Approach

1. **Clean Git History**
   - No copied third-party code in repository
   - Submodule tracked by commit hash
   - Easy to see which version of pi-skills is being used

2. **Easy Updates**
   ```bash
   git submodule update --remote .pi/skills/pi-skills
   git commit -m "Update pi-skills"
   ```

3. **Proper Pi Discovery**
   - Skills in `.pi/skills/pi-skills/` are automatically discovered
   - No symlink hacks required
   - Follows Pi's expected directory structure

4. **Lightweight Docker Image**
   - npm dependencies installed at runtime, not build time
   - Base image stays small
   - Faster builds when pi-skills doesn't change

5. **Version Control**
   - Exact commit of pi-skills tracked in repository
   - Can pin to specific version or update to latest
   - Reproducible builds across environments

## Migration Path for Users

For anyone cloning thepopebot after this change:

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/YOUR_ORG/thepopebot.git

# Or if already cloned
git submodule update --init --recursive
```

For existing deployments:
- No action needed - entrypoint.sh handles initialization
- Next Docker build will use new approach
- Old runtime git clone removed

## Technical Details

### Submodule Metadata
- **URL:** https://github.com/badlogic/pi-skills.git
- **Path:** .pi/skills/pi-skills
- **Current commit:** 75d32a382b0c8aafce356d68e17d2dc94c0c953b
- **Branch:** main

### Runtime Installation Order
1. Git clone with `--recurse-submodules` → fetches submodule
2. Install browser-tools npm deps (includes Puppeteer + Chromium)
3. Install brave-search npm deps
4. Pi starts → discovers all skills in `.pi/skills/`

### Files Modified
- `.gitmodules` (created)
- `.pi/skills/pi-skills` (added as submodule)
- `Dockerfile` (removed git clone, added comment)
- `entrypoint.sh` (updated clone, added npm installs, removed symlink)
- `.github/workflows/docker-build.yml` (added submodules: true)
- `.github/workflows/update-event-handler.yml` (added submodules: true)
- `docs/SUBMODULES.md` (created)
- `docs/CUSTOMIZATION.md` (updated)

## Verification

Run the test script to verify setup:
```bash
./tmp/test-skill-discovery.sh
```

Expected output:
```
✓ SUCCESS: All 10 skills discovered (2 custom + 8 from pi-skills)
```

## Next Steps

1. **Merge this PR** to enable submodule-based skill discovery
2. **Rebuild Docker image** if using custom IMAGE_URL (automatic if using GHCR)
3. **Test a job** to ensure skills work correctly at runtime
4. **Update pi-skills** regularly using `git submodule update --remote`

## References

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [pi-skills Repository](https://github.com/badlogic/pi-skills)
- [Pi Coding Agent](https://github.com/badlogic/pi-coding-agent)
