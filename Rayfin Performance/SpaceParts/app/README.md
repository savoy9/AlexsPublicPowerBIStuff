# SpaceParts Fabric app source

This is the baseline analytics app. See the [companion README](../README.md) for the sample data, model requirements, and standalone trend queries. The app's DAX templates in `src/queries/` contain filter markers that the query factory replaces at runtime.

Install dependencies with `npm ci` on Node.js 22. Run `npm run build` for a local TypeScript and Vite build, or `npm test` for the unit tests. Neither command needs a Fabric connection.

To run against your own Fabric environment:

1. Follow the [Fabric Data Apps template guide](https://learn.microsoft.com/fabric/apps/data-apps-template) for your workspace and app. Copy `rayfin/rayfin.example.yml` to the ignored `rayfin/rayfin.yml` and replace all placeholders. The delegated `salesmodel` connector targets **your semantic model**; the signed-in user needs access to it.
2. Use `npx rayfin env --framework vite` after setting up your own Rayfin environment, or supply the following values in the ignored `.env.local`:
   - `VITE_RAYFIN_API_URL` and `VITE_RAYFIN_PUBLISHABLE_KEY` for your app's Rayfin backend.
   - `VITE_FABRIC_WORKSPACE_ID`, `VITE_FABRIC_ITEM_ID` (the **app** item, not the model), and `VITE_FABRIC_PORTAL_URL` for Fabric authentication.
   - Optionally, `VITE_SPACEPARTS_MODEL_ID` for the client-side interaction manager. It does not choose the connector's query target.
3. Run `npm run dev`. Use your own configured Fabric shell and allowed redirect origin for sign-in. Vite exposes `VITE_` values to the browser: never put credentials or server secrets in them.

The checked-in connector schema declares the client-side operation only and has no target binding. A hard-coded model ID and a test host were replaced with reader configuration and a fictional fixture, respectively. The package lock is for npm dependencies, not Rayfin deployments. Template-only media, local configuration, and benchmark tooling are not included.
