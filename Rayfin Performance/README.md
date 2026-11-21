# Rayfin Performance

This folder contains definition files and the AdventureWorks query reduction experiments. It does not include dataset rows, credentials, tenant exports, benchmark traces, or built app assets.

The SpaceParts example is not included in this release.

## AdventureWorks

[`AdventureWorks.pbip`](AdventureWorks/AdventureWorks.pbip) points to the native report, which uses a relative path to the adjacent semantic model. The report definition preserves the repaired report-level `extension` measures. The semantic model is the AdventureWorksDW Direct Lake model with its original measures and relationships.

1. Use the [official AdventureWorksDW sample](https://learn.microsoft.com/sql/samples/adventureworks-install-configure) to provision your own compatible Fabric Lakehouse. The model expects the entities and columns named by its partitions and source-column mappings, including any additional model-specific helper columns.
2. In `AdventureWorks.SemanticModel/model.bim`, replace `REPLACE_WITH_WORKSPACE_ID` and `REPLACE_WITH_LAKEHOUSE_ID` in the `DirectLake - OneLake` expression. Configure credentials in your own environment, then open `AdventureWorks.pbip` in a current Power BI Desktop or deploy the definitions to your own Fabric workspace.
3. The `AdventureWorks/rayfin` folder contains the original app's Rayfin service configuration and connector schema, not the separately benchmarked exact-replay app or a standalone frontend. To use it within a Rayfin app project, substitute your app, Fabric workspace, and semantic model IDs. Add your own deployed redirect URI if needed.

## Query Reduction

[`index.csv`](Query%20Reduction/index.csv) lists **51 AdventureWorks variants and 199 DAX request files**. Each `.dax` file is one request; multiple `EVALUATE` statements within a request stay together. These are the recorded statements for the tested filter states, not generic query templates.

| Pass | Variants | DAX files | Source and scope |
|---|---:|---:|---|
| Query sharing | 10 | 67 | Candidate IDs 01–10 from the `live-full/queries.json` capture, with separate December refresh and November month-change requests. The exact replay baseline and candidate 11 (the negative control) are not counted as alternatives. |
| Browser render | 11 | 32 | Rounds r01–r10 from `render-screen/queries.json`, four changed statements from `render-repair/queries.json` under their original variant's `repair` folder, and r11 from `render-final/queries.json`. Controls and identical repeats are not counted as variants. |
| Time-boxed search | 30 | 100 | The 15, 10, and 5 newly attempted layouts from `search-screen`, `search-screen2`, and `search-screen3` `queries.json` captures. A prior plan used again as a comparator is not a new variant; no alternatives were removed based on matching DAX text. |

The statements were extracted from the benchmark runners' saved manifests, not regenerated or rerun. Use a DAX client against the rebound AdventureWorks semantic model to inspect or run them. The request count is not the number of trials or `EVALUATE` statements.
