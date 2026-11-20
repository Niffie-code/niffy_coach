# Publish niffy_coach on GitHub Pages

The repository name is `niffy_coach`. A GitHub project site uses the account hostname followed by the repository name, giving this project the path `/niffy_coach/`. A separate custom hostname would need a DNS-compatible name and a domain you control.

1. Push the repository to the `main` branch.
2. Under **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. In **Actions**, open **Publish Niffy Coach** and run the workflow if the push preceded Pages setup.
4. Confirm the deployment job finished successfully. Open the URL reported by its `github-pages` environment, load a study position and play a move against Stockfish.

## Vercel sync service

Vercel serves `site/` with the Node handlers in `api/`. Connect a private Vercel Blob store to the production project using `BLOB_READ_WRITE_TOKEN`. Lichess OAuth uses PKCE, a host-only HTTP-only session cookie and the canonical `https://niffy-coach.vercel.app/` callback. The server verifies the account before reading or merging profile records. Use `npm ci` and `npm test` to verify the server and client behavior locally.

Every push to `main` runs the checks and uploads only `site/`. No build credentials or environment variables are required. No custom domain or CNAME is configured. To roll back a release, revert its commit and publish the new head.

## Troubleshooting

- **404 at the site root.** Confirm Pages is enabled, the workflow succeeded, and the address includes the repository path and trailing slash.
- **Game provider error.** Check the username and retry after rate limiting. A saved practice game or the diagnostic can be used while the provider is unavailable.
- **Missing progress.** Confirm the browser profile and site origin. Restore a backup or open the original private coach if you trained there.
- **Engine loading error.** Check that `site/vendor/stockfish.js` and `site/vendor/stockfish.wasm` are included in the same deployment. The practice board needs WebAssembly and Web Workers.

[GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
