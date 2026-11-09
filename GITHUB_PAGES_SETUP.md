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

### Fixing the "Upgrade Required" Error on Your Custom Domain (`spineldistribution.com`)

If visiting **`https://spineldistribution.com`** shows a black screen with text **`Upgrade Required`**, here is why:
- Your domain's DNS is currently pointing to **`102.203.116.14`** (an OLITT website builder server).
- Because the OLITT free plan / trial expired or does not support custom domains without an upgrade, OLITT's server responds with `HTTP 426 Upgrade Required`.
- Your domain is **not** currently reaching GitHub Pages or your hosting server!

#### How to fix this in your Domain Registrar (Truehost / Namecheap / GoDaddy / Whogohost):

##### If deploying to GitHub Pages:
1. Log in to where you bought `spineldistribution.com` (your DNS manager).
2. Delete the old A record pointing to `102.203.116.14`.
3. Add these **4 A records** for `@` (host apex):
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
4. Add a **CNAME record** for `www`:
   - Name: `www`
   - Target: `<your-github-username>.github.io`
5. In your GitHub repository under **Settings > Pages > Custom domain**, type `spineldistribution.com` and click **Save**.
6. Check the box **"Enforce HTTPS"**.
7. Your domain will immediately display the full Spinel Distribution application!

##### If deploying to cPanel:
1. Find your cPanel server's **Shared IP Address** (displayed on the right-hand panel of your cPanel dashboard).
2. In your domain DNS manager, change the A record for `spineldistribution.com` from `102.203.116.14` to your cPanel Shared IP address.
3. In cPanel **Setup Node.js App**, make sure the app root is set to `public_html` with startup file `app.js` and Node `20.x`, then click **Restart**.

