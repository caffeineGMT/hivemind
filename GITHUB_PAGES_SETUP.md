# GitHub Pages Staging - Quick Setup Guide

## ✅ What's Already Done

- ✅ Vite configuration updated for GitHub Pages base path (`/hivemind/`)
- ✅ `.nojekyll` file added to prevent Jekyll processing
- ✅ Documentation created (STAGING.md)
- ✅ All changes pushed to GitHub

## 🚀 Next Steps (2 minutes)

### Step 1: Enable GitHub Pages

1. Go to your repository: https://github.com/caffeineGMT/hivemind
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select **GitHub Actions**
4. Save

### Step 2: Add the Deployment Workflow

Since the OAuth token doesn't have `workflow` scope, add the workflow file manually:

1. Go to https://github.com/caffeineGMT/hivemind/new/master?filename=.github/workflows/deploy-staging.yml
2. Paste the contents from `.github/workflows/deploy-staging.yml` (shown below)
3. Click **Commit changes**

**Workflow File Contents:**

```yaml
name: Deploy to GitHub Pages (Staging)

on:
  push:
    branches: [master, main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: ui/package-lock.json

      - name: Install dependencies
        run: cd ui && npm ci

      - name: Build for GitHub Pages
        run: cd ui && npm run build
        env:
          GITHUB_PAGES: 'true'

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./ui/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 3: Add the E2E Test Workflow (Optional but Recommended)

1. Go to https://github.com/caffeineGMT/hivemind/new/master?filename=.github/workflows/e2e.yml
2. Paste the contents from `.github/workflows/e2e.yml` (shown below)
3. Click **Commit changes**

**E2E Workflow File Contents:**

```yaml
name: E2E Tests

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: |
            package-lock.json
            ui/package-lock.json

      - name: Install backend dependencies
        run: npm ci

      - name: Install UI dependencies
        run: cd ui && npm ci

      - name: Install Playwright browsers
        run: cd ui && npx playwright install --with-deps chromium

      - name: Build UI
        run: cd ui && npm run build

      - name: Run E2E tests
        run: cd ui && npx playwright test
        env:
          CI: true
          ANTHROPIC_API_KEY: test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: ui/playwright-report/
          retention-days: 7
```

## 📊 Verification

After adding the workflow files:

1. Go to **Actions** tab: https://github.com/caffeineGMT/hivemind/actions
2. You should see a workflow running
3. Once complete (2-3 minutes), your staging site will be live at:

   **🌐 https://caffeinegmt.github.io/hivemind/**

## 🔄 Deployment Flow (Going Forward)

```
Code Changes → Push to GitHub → GitHub Actions Build → GitHub Pages Deploy (Auto)
                                                      ↓
                                                  Preview on staging
                                                      ↓
                                              Manual Vercel deploy (Production)
```

Every push to `master` will automatically update your staging site!

## 🛠️ Alternative: Fix OAuth Token (Future)

To avoid manual workflow creation in the future:

1. Go to https://github.com/settings/tokens
2. Find your token or create a new one
3. Ensure **workflow** scope is checked
4. Update your git credentials:
   ```bash
   git config --global credential.helper store
   # Next git push will ask for username + new token
   ```

---

**Status**: Configuration is complete. Just add the workflow files via GitHub UI and you're done! 🚀
