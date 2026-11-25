# SpaceParts performance examples

A companion to the [AdventureWorks examples](../README.md): four versions of the same monthly trend query, additional optimization experiments, one custom measure, and the baseline Fabric app source.

| Featured query | What it shows |
|---|---|
| [Original](queries/featured/01-original.dax) | The app's opening query. `SUMMARIZECOLUMNS` groups the month axis; `IGNORE` keeps months even when the measures are blank. |
| [PBI Style](queries/featured/02-pbi-style.dax) | A Power BI report-pattern adaptation with `ADDMISSINGITEMS` and a row cap, adjusted to match the app's output. This is not the exact Desktop capture. |
| [Round 1](queries/featured/03-round-1.dax) | Groups the month keys first, then evaluates the same measures with `ADDCOLUMNS`. |
| [Round 2](queries/featured/04-round-2.dax) | Evaluates the measures at Month Start grain and joins back to the original two-column month axis. |

The four examples matched the ordered opening result on the benchmark model. This is not a guarantee of equivalence on another model or for every filter combination. [Round 1 experiments](queries/round-1/) include alternate grouping and filter placement; [Round 2 experiments](queries/round-2/) include the parity-checked `NONVISUAL` finalist and exploratory range and `TREATAS` forms. Treat those experiments as comparisons, not drop-in replacements. The app still runs the baseline query; the standalone query files retain the tested DAX text.

## Use your own model

1. Obtain the SpaceParts sample from [Tabular Editor's official SpaceParts guide](https://tabulareditor.com/blog/reintroducing-the-spaceparts-dataset) and follow its usage terms. No model or dataset is redistributed here.
2. Use an authorized semantic model in your own workspace. The official sample's starter model may not have the same tables, columns, relationships, or measures as the benchmark model. Map the query references to your model before running them. The trend queries use a separate Trend Date axis, window-bound measures, and trend measures for sales, budget, returns and warranty, and on-time delivery.
3. If running the app's invoice detail, add the [custom Invoice line sales EUR measure](measures/invoice-line-sales-eur.dax) to `Invoices` and hide it. It requires the ingestion row key and the existing invoice-to-budget-rate relationship. It is for a single invoice line, not all-row totals.

See [app setup](app/README.md) for the developer-supplied connector configuration. The bundle does not include sample outputs, raw traces, captured Desktop queries, environment files, deployment bindings, or build output.
