# GitHub Pages Staging Setup

## Overview

This repository uses **GitHub Pages** as the staging/preview environment and **Vercel** for production.

## Deployment Flow

```
Code Changes → Push to GitHub → GitHub Pages Auto-Deploy (Staging) → Manual Vercel Deploy (Production)
```

### Staging (Automated)
- **URL**: https://caffeinegmt.github.io/hivemind/
- **Trigger**: Automatic on every push to `main` or `master` branch
- **Workflow**: `.github/workflows/deploy-staging.yml`
- **Purpose**: Preview and test changes before production deployment

### Production (Manual)
- **URL**: [Your Vercel domain]
- **Trigger**: Manual deployment by project owner
- **Purpose**: Live production environment

## How It Works

1. **Push to GitHub**: Any push to the main branch triggers the GitHub Actions workflow
2. **Build Process**: The workflow builds the Vite app with `GITHUB_PAGES=true` environment variable, which sets the correct base path (`/hivemind/`)
3. **Deploy to Pages**: The built files are automatically deployed to GitHub Pages
4. **Preview**: Visit https://caffeinegmt.github.io/hivemind/ to see the latest staging build
5. **Production**: When satisfied with staging, manually deploy to Vercel

## Configuration Files

- **Vite Config**: `ui/vite.config.ts` - Configures base path based on `GITHUB_PAGES` env var
- **GitHub Workflow**: `.github/workflows/deploy-staging.yml` - Automated deployment to GitHub Pages
- **Jekyll Bypass**: `ui/public/.nojekyll` - Prevents GitHub from processing files with Jekyll

## Local Development

For local development, the base path is `/` (root). The staging base path `/hivemind/` only applies when building for GitHub Pages.

```bash
cd ui
npm run dev  # Runs on http://localhost:5173
npm run build  # Production build (base: /)
GITHUB_PAGES=true npm run build  # Staging build (base: /hivemind/)
```

## Enabling GitHub Pages

To enable GitHub Pages for this repository:

1. Go to repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow will automatically deploy on the next push

## Notes

- GitHub Pages deployment is **free** for public repositories
- Build artifacts are stored for deployment but not committed to the repository
- The `.nojekyll` file ensures Vite's assets load correctly on GitHub Pages
