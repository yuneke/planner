# Setup (about 10 minutes)

## 1. Supabase (database and login)
1. Go to https://supabase.com, sign up, and click **New project**. Pick any name, pick a region close to you, and save the database password somewhere safe (you won't need it for this app).
2. When the project is ready, go to **SQL Editor** in the left sidebar, then **New query**. Paste in all of `schema.sql`, then click **Run**. It should say "Success. No rows returned".
3. Go to **Project Settings → API** (on some dashboards this is **Connect** or **API Keys**) and copy two values:
   - **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - the **anon / public** key, or the **publishable** key on newer projects. Do **not** use the `service_role` or secret key.
4. Open `app.js`. In the first lines, replace `PASTE_PROJECT_URL` and `PASTE_ANON_KEY` with those two values.
   The anon key is safe to put in a public site, because the row-level security rules in `schema.sql` stop anyone from reading your data.

## 2. GitHub Pages (hosting)
Run these in this folder, after creating an **empty** repo called `planner` on github.com:
```
git init
git add index.html app.js style.css schema.sql
git commit -m "Planner"
git branch -M main
git remote add origin https://github.com/<your-username>/planner.git
git push -u origin main
```
Then on GitHub, open the repo's **Settings → Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, pick `main` and `/ (root)`, and click Save. After about a minute your site is live at `https://<your-username>.github.io/planner/`.

## 3. Allow the login link to go back to your site
In Supabase, open **Authentication → URL Configuration**:
- Set **Site URL** to `https://<your-username>.github.io/planner/`
- Under **Redirect URLs**, add that same address.

## 4. Use it
Open the site and enter your email. Open the link from the email **on the same device** you requested it from. You stay signed in on that device, so do this once on your laptop and once on your phone.
On the phone, you can use **Share → Add to Home Screen** to get an app-like icon.

## Good to know
- **Email limit:** Supabase's built-in email sender only sends a few login emails per hour. If no link arrives, wait a while before trying again.
- **Pausing:** free projects pause after about a week without use. If the app says it can't load, open the Supabase dashboard and click **Restore project**. No data is lost.
- **Changing the app later:** edit the files, then run `git commit -am "change" && git push`. Pages updates in about a minute.

## Testing without Supabase
Run `node test/serve.js`, then open:
- `http://localhost:8765/` to run the automated checks (results appear at the bottom of the page)
- `http://localhost:8765/?seed` to try the app with sample data. Nothing is saved.
