# Training and saved games

Start with games played under the competition time control. The coach keeps blitz and rapid drill histories separately. Use the diagnostic when returning after a long break. As you play, the coach can base its priorities on fresh games and recent attempts.

**Openings.** Review the most common lines from your imported games, select the ones you want to keep, then replay their decisions from your side. The engine can accept playable alternatives.

**Calculation.** Enter the entire sequence when prompted. The review distinguishes your candidate move, the opponent’s reply and your continuation. Use **Play from here** to see what happens after the exercise.

**Competition week.** Set the daily time budget in **My week**. Use **Practice** for 5+0 or 10+0 games, with an optional increment. Resigned and completed practice games with moves enter your game library.

## Your data

The GitHub Pages edition stores games, settings and results in the current browser’s local storage. Anyone using that browser profile can access them. Clearing site data removes the local copy. The public repository contains application files and synthetic test games.

To move your progress, open **Your training profile → Download backup** and transfer the JSON file privately. On the other device open **Restore backup**. Matching records are merged by timestamp. Treat the backup as personal game history.

For the original signed-in experience, choose **Open private synced coach**. It retains its own profile. To copy its saved records into Pages, sign in to the private coach, open `/api/profile` on that same site, save the JSON response, then restore it on Pages.

The importer contacts the selected chess provider directly to read the supplied public username. It requests up to 30 completed standard blitz and rapid games. The engine analyzes positions locally while the tab is open.
