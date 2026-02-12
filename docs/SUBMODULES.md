# Git Submodules in thepopebot

This document explains how thepopebot uses git submodules for skill management.

## Overview

thepopebot uses [pi-skills](https://github.com/badlogic/pi-skills) as a git submodule to provide a collection of ready-to-use skills for the Pi coding agent. This approach ensures:

- **Clean git history**: No copying of third-party code into our repository
- **Easy updates**: Pull upstream changes with `git submodule update --remote`
- **Proper skill discovery**: Skills are placed in `.pi/skills/pi-skills/` where Pi automatically discovers them
- **Version tracking**: The exact commit of pi-skills is tracked in the repository

## Submodule Location

```
.pi/skills/pi-skills/  ← git submodule
├── browser-tools/
├── brave-search/
├── gccli/
├── gdcli/
├── gmcli/
├── transcribe/
├── vscode/
└── youtube-transcript/
```

## How It Works

### 1. Build Time (Dockerfile)

The Dockerfile installs global npm packages that some skills require:
```dockerfile
RUN npm install -g @mariozechner/gccli
RUN npm install -g @mariozechner/gmcli
```

However, skill-specific npm dependencies (like browser-tools' Puppeteer) are NOT installed at build time. This keeps the base image lightweight.

### 2. Runtime (entrypoint.sh)

When the Docker container starts:
1. The repository is cloned with `--recurse-submodules` to fetch the pi-skills submodule
2. Skill-specific npm dependencies are installed:
   ```bash
   cd /job/.pi/skills/pi-skills/browser-tools && npm install
   cd /job/.pi/skills/pi-skills/brave-search && npm install
   ```
3. Pi automatically discovers all skills in `.pi/skills/` (including both custom skills and pi-skills)

### 3. GitHub Actions

All workflows that checkout the repository use `submodules: true`:
```yaml
- uses: actions/checkout@v4
  with:
    submodules: true
```

This ensures:
- **docker-build.yml**: Docker build includes submodule files
- **update-event-handler.yml**: Notification webhook has access to full codebase including skills

## Updating pi-skills

To pull the latest changes from upstream pi-skills:

```bash
# Update to latest main branch
git submodule update --remote .pi/skills/pi-skills

# Commit the update
git add .pi/skills/pi-skills
git commit -m "Update pi-skills submodule to latest"
git push
```

To update to a specific commit:

```bash
cd .pi/skills/pi-skills
git checkout <commit-hash>
cd ../../..
git add .pi/skills/pi-skills
git commit -m "Update pi-skills to <commit-hash>"
git push
```

## Adding Additional Submodules

To add another skill collection as a submodule:

```bash
git submodule add <repository-url> .pi/skills/<skill-name>
git commit -m "Add <skill-name> submodule"
git push
```

Pi will automatically discover any `SKILL.md` files in subdirectories of `.pi/skills/`.

## Custom Skills vs. Submodule Skills

| Type | Location | Management | Use Case |
|------|----------|------------|----------|
| **Custom** | `.pi/skills/<skill-name>/` | Direct git commits | Project-specific skills, thepopebot personality |
| **Submodule** | `.pi/skills/pi-skills/` | Git submodule | Community skills, upstream updates |

Custom skills (like `brave-search`, `llm-secrets`, `modify-self`) are committed directly to the thepopebot repository. They provide project-specific functionality and personality.

Submodule skills come from external repositories and are tracked by commit hash. They provide general-purpose capabilities maintained by the community.

## Troubleshooting

### Submodule not initialized after clone

If you clone the repository without `--recurse-submodules`:
```bash
git submodule update --init --recursive
```

### Submodule shows changes but none were made

The submodule pointer may be out of sync. Reset it:
```bash
git submodule update --recursive
```

### Skill conflicts

If Pi shows skill name collisions (e.g., "brave-search" exists both as custom skill and in pi-skills), one will be auto-selected. Check the Pi startup output for which path is being used.

To resolve: rename or remove one of the conflicting skills.

## Technical Details

### Dockerfile Changes

**Before** (old approach):
```dockerfile
# Clone pi-skills at build time to /pi-skills
RUN git clone https://github.com/badlogic/pi-skills.git /pi-skills
WORKDIR /pi-skills/browser-tools
RUN npm install
```

**After** (submodule approach):
```dockerfile
# Skills installed at runtime after repo clone
# Note: pi-skills is managed as a git submodule at .pi/skills/pi-skills
```

### entrypoint.sh Changes

**Before**:
```bash
git clone --single-branch --branch "$BRANCH" --depth 1 "$REPO_URL" /job
ln -sf /pi-skills/brave-search /job/.pi/skills/brave-search
```

**After**:
```bash
git clone --single-branch --branch "$BRANCH" --depth 1 --recurse-submodules "$REPO_URL" /job
(cd /job/.pi/skills/pi-skills/browser-tools && npm install --silent)
(cd /job/.pi/skills/pi-skills/brave-search && npm install --silent)
```

## Benefits

1. **Cleaner git history**: No large binary files or copied code from upstream
2. **Easier updates**: `git submodule update --remote` instead of manual copy-paste
3. **Version tracking**: Know exactly which version of pi-skills is being used
4. **Proper Pi integration**: Skills are in the expected discovery path
5. **Upstream contributions**: Easy to test and contribute changes back to pi-skills
