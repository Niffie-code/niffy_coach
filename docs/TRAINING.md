# Training and saved games

Start with games played under the competition time control. The coach keeps blitz and rapid drill histories separately. Use the diagnostic when returning after a long break. As you play, the coach can base its priorities on fresh games and recent attempts.

**Openings.** Review the most common lines from your imported games, select the ones you want to keep, then replay their decisions from your side. The engine can accept playable alternatives.

**Calculation.** Enter the entire sequence when prompted. The review distinguishes your candidate move, the opponent’s reply and your continuation. Use **Play from here** to see what happens after the exercise.

**Competition week.** Set the daily time budget in **My week**. Use **Practice** for 5+0 or 10+0 games, with an optional increment. Resigned and completed practice games with moves enter your game library.

## Your data

The GitHub Pages edition stores games, settings and results in the current browser’s local storage. Anyone using that browser profile can access them. Clearing site data removes the local copy. The public repository contains application files and synthetic test games.

To move your progress, open **Your training profile → Download backup** and transfer the JSON file privately. On the other device open **Restore backup**. Matching records are merged by timestamp. Treat the backup as personal game history.

For the original signed-in experience, choose **Open private synced coach**. It retains its own profile. To copy its saved records into Pages, sign in to the private coach, open `/api/profile` on that same site, save the JSON response, then restore it on Pages.

## Automatic updates

On Vercel, connect the same Lichess account under **Your training profile** on each device. The coach batches saves after five quiet seconds and checks for changes every three minutes while visible, on return to the tab, and when connectivity returns. Offline changes are retained locally for retry. Your Lichess sign-in identifies your private profile. Additional usernames only select public games to study.

Under **Games → Linked Lichess accounts**, add each username once. The first check fetches up to 100 recent rapid games and 100 recent blitz games per account, using available completed standard games in each format. Later checks request new games with a one-day overlap and deduplicate by game ID. Checks run on opening or returning to the coach and every 15 minutes while the tab is visible. Remove a username to stop future imports and retain its existing games. Closing the app pauses checks until the next visit.

The importer contacts the selected chess provider directly to read the supplied public username. It requests up to 100 completed standard games per format on the initial import. The Games screen shows how many have finished analysis. The engine analyzes positions locally while the tab is open.
