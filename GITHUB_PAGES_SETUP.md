# GitHub Pages Activation & Deployment Guide

If your GitHub repository shows **"github-pages inactive"** under Settings > Pages, follow these simple steps to activate it immediately.

---

### Why "github-pages inactive" Appears

GitHub displays `github-pages inactive` whenever:
1. The repository's Pages source setting is still waiting for its first automated build.
2. The workflow was restricted to a specific branch name (e.g. `main` vs `master`).
3. The previous workflow uploaded raw files without compiling the React/Vite production bundle.

We have now updated your repository with a production-grade GitHub Actions deployment workflow (`.github/workflows/static.yml`) and configured Vite with relative paths (`base: './'`) so the app works on any GitHub repository name.

---

### Step-by-Step Fix (Takes 30 seconds)

#### Option 1: Using GitHub Actions (Recommended)

1. Open your repository on GitHub (`https://github.com/<your-username>/<your-repo>`).
2. Click on **Settings** (gear icon in the top navigation bar).
3. In the left sidebar, click on **Pages** (under the "Code and automation" section).
4. Under **Build and deployment**:
   - Look at the **Source** dropdown.
   - Change it from **"Deploy from a branch"** to **"GitHub Actions"**.
5. Push your code to GitHub (or go to the **Actions** tab, select **Deploy Spinel to GitHub Pages**, and click **Run workflow**).
6. Within 1-2 minutes, the workflow will build the React app and deploy it.
7. Return to **Settings > Pages**: the status will turn green and say:
   **"Your site is live at https://<your-username>.github.io/<your-repo>/"**!

---

#### Option 2: Using the `gh-pages` Branch

Our workflow is dual-configured: whenever it runs, it also automatically publishes the compiled build to the `gh-pages` branch.
1. In **Settings > Pages**:
2. Under **Source**, leave it as **"Deploy from a branch"**.
3. Under **Branch**, select **`gh-pages`** and folder **`/ (root)`**.
4. Click **Save**.
5. Your site is live!

---

### Included Fixes in this Release

- **Vite Base Path (`base: './'`)**: Configured relative paths so scripts and CSS load seamlessly whether hosted at root or subpath `/<repository-name>/`.
- **SPA Fallback (`404.html`)**: Automatically generates `dist/404.html` so direct navigation or page refreshes on subroutes (`/cart`, `/catalog`, `/quote`, `/orders`) load properly without 404 errors.
- **Jekyll Bypassed (`.nojekyll`)**: Added `.nojekyll` so GitHub Pages serves all assets directly without Jekyll processing.
- **Branch Support**: The workflow triggers on both `main` and `master`, plus supports manual triggering via `workflow_dispatch`.
- **TypeScript & Applet Stability**: Fixed all TypeScript errors, missing types, and property typos.
