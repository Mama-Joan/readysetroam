# Passage

Passage is one place for the trips you take with other people. Each trip has its own group, a day-by-day plan, a map with a different colour per day, hotels on a night-by-night timeline, flights by group, and a budget that can show what each group owes you.

Hokkaido (December 2026), South Island (June 2026), and Ipoh (September 2025) are already in the app. On the Hokkaido trip, Joan, Mummy, and Father & Mother Tan keep separate tracks where the sheet says they do. Confirmation numbers and who-owes-whom stay in the browser until you download a copy.

## Use it on your computer

You need Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the address the terminal prints (it uses port 4732).

- Open a trip, pick a day, and click a stop. The matching pin is highlighted in that day's colour.
- **Whole trip** draws every pin in order, with a new colour when the day changes.
- **Edit day** and **Add a day** set the heading and the route. The form shows the route already on the trip.
- **Stays** is a night-by-night timeline. A rose row still needs a hotel for someone.
- **Flights** lists each group's legs. A rose card is missing a time or a city.
- **Add a line** can be split across groups. The money tab then shows what each group owes you, in this browser only.
- **Restore published copy** throws away those local edits for a trip that shipped with the app.
- **Download trip file** saves a JSON file. Delete any confirmation numbers in it before you commit that file to a public repository.

## Put it on GitHub

You do not lay the days out by hand on the GitHub website. This folder is already the project. The repository for it is [Mama-Joan/readysetroam](https://github.com/Mama-Joan/readysetroam).

1. The code is pushed to that repository as it is. You do not rearrange files in the GitHub website.
2. On the repository, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` builds the site on every push to `main` and publishes it. The address will be:

   `https://mama-joan.github.io/readysetroam/`

   The first run can take a minute. Open the **Actions** tab and confirm “Publish site” succeeded.

Pushing to `main` again republishes the site. Edits you made only in the browser are not in that push until you put them into `src/data` (or replace the trip data with the downloaded JSON) and push.

Gmail is not connected in this version.
