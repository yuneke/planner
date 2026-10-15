# Setup (about 10 minutes)

## 1. Supabase (database and login)
1. Go to https://supabase.com, sign up, and click **New project**. Pick any name, pick a region close to you, and save the database password somewhere safe (you won't need it for this app).
2. When the project is ready, go to **SQL Editor** in the left sidebar, then **New query**. Paste in all of `schema.sql`, then click **Run**. It should say "Success. No rows returned". Then do the same with `accounts.sql` (usernames) and `plans.sql` (activities without a time).
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

## 3. Login settings
In Supabase, open **Authentication → Sign In / Providers**:
- Under **Email**, switch off **Confirm email**, so nobody needs to open an inbox to sign up.
- Open **Authentication → URL Configuration**: set **Site URL** to `https://<your-username>.github.io/planner/` and add the same address under **Redirect URLs**. The GitHub button and the "Forgot password?" email both come back to this address.

### GitHub login (optional)
1. On github.com, open **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - **Homepage URL:** your site address
   - **Authorization callback URL:** `https://<project-ref>.supabase.co/auth/v1/callback` (your Project URL plus `/auth/v1/callback`)
2. Click **Register**, then **Generate a new client secret**.
3. In Supabase, open **Authentication → Sign In / Providers → GitHub**, switch it on, paste the **Client ID** and **Client secret**, and save.

If your GitHub account uses the same email as an existing planner account, signing in with GitHub opens that same planner.

## 4. Use it
Open the site and click **Create account** (email, username, password), or **Continue with GitHub**. From then on, sign in with your email or username and password, on any device. You stay signed in on each device.
Accounts made with the old email links have no password yet: click **Forgot password?** once, open the email, and choose a username and password.
Once everyone who needs an account has one, you can switch off **Allow new users to sign up** under **Authentication → Sign In / Providers** so no one else can join.
On the phone, you can use **Share → Add to Home Screen** to get an app-like icon.

## Good to know
- **Pausing:** free projects pause after about a week without use. If the app says it can't load, open the Supabase dashboard and click **Restore project**. No data is lost.
- **Changing the app later:** edit the files, then run `git commit -am "change" && git push`. Pages updates in about a minute.

## Testing without Supabase
Run `node test/serve.js`, then open:
- `http://localhost:8765/` to run the automated checks (results appear at the bottom of the page)
- `http://localhost:8765/?seed` to try the app with sample data. Nothing is saved.
