# Deployment Workflow

This document outlines the deployment process for Hivemind Engine.

## Quick Reference

```bash
# Standard workflow for all code changes:
npm run build          # (1) Verify zero errors
# Fix any errors that appear
git add -A             # (2) Stage all changes
git commit -m "..."    # (3) Commit with descriptive message
git push origin main   # (4) Push to GitHub (staging)
```

## Environments

### GitHub Pages (Staging Preview)
- **Purpose**: Live preview environment for testing changes
- **URL**: https://caffeinegmt.github.io/hivemind/
- **Deployment**: Automatic via GitHub Actions on every push to `main`
- **Build**: Vite static export with `/hivemind/` base path
- **Workflow**: `.github/workflows/deploy-staging.yml`
- **Requirements**:
  - Build must pass with **zero errors**
  - All TypeScript/ESLint errors must be resolved
  - No build warnings should be suppressed

### GitHub (Repository)
- **Purpose**: Version control and CI/CD
- **URL**: https://github.com/caffeineGMT/hivemind.git
- **Branch**: `main` (or `master`)

### Vercel (Production)
- **Purpose**: Production environment
- **Deployment**: **Manual only** — handled by Michael
- **Trigger**: After staging validation passes
- **Access**: Do not run `vercel`, `vercel deploy`, or Vercel CLI commands

## Standard Workflow

### Step 1: Write Code
Make your changes to the codebase. Follow project conventions in CLAUDE.md.

### Step 2: Verify Build
**CRITICAL**: Always verify the build passes before committing.

```bash
npm run build
```

**Requirements**:
- ✅ Zero errors required
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors
- ❌ Do NOT suppress errors with `// @ts-ignore` or similar
- ❌ Do NOT commit if build fails

### Step 3: Fix Any Errors
If the build fails:
1. Read the error messages carefully
2. Fix the root cause (don't suppress)
3. Re-run `npm run build`
4. Repeat until clean

### Step 4: Commit and Push
Once the build passes:

```bash
git add -A
git commit -m "Descriptive message about what you built"
git push origin main
```

**Commit Message Guidelines**:
- Be specific about the feature/fix
- Reference task/issue numbers if applicable
- Examples:
  - ✅ "Add real-time cost tracking dashboard with token breakdown"
  - ✅ "Fix WebSocket reconnection logic with exponential backoff"
  - ❌ "update files"
  - ❌ "wip"

## Automated Checks

After pushing to GitHub:
- Health checks run automatically
- Rollback protection is enabled
- Deployment status appears in orchestrator dashboard

## Production Deployment

**Production deployment to Vercel is manual and handled exclusively by Michael.**

Why manual?
- Final QA review before live traffic
- Timing control for customer-facing changes
- Ability to coordinate with external dependencies
- Emergency rollback capability

## Emergency Rollback

If a production issue occurs:
1. Contact Michael immediately
2. Provide commit hash and description of issue
3. Manual rollback will be performed
4. Post-mortem analysis follows

## Common Issues

### Build fails with TypeScript errors
```bash
# Check for type mismatches
npm run build 2>&1 | grep "error TS"

# Fix each error individually
# Do NOT use @ts-ignore or @ts-expect-error
```

### Build fails with ESLint errors
```bash
# Run ESLint directly to see all issues
npm run lint

# Fix formatting issues automatically
npm run lint:fix
```

### Forgot to verify build before committing
```bash
# If already committed locally (not pushed):
git reset HEAD~1          # Undo commit, keep changes
npm run build             # Verify
git add -A && git commit  # Re-commit

# If already pushed:
# Fix issues, create new commit, push again
```

## Project Philosophy

This is a **LOCAL operational dashboard**, not a SaaS product. Deployment is intentionally controlled to ensure:
- Stability for operational use
- Clean separation between staging (GitHub) and production (Vercel)
- High quality bar for production code

See CLAUDE.md for full project guidelines.
