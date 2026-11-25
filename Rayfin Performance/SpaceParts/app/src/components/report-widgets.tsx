import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { KpiCard, VegaVisual } from "@microsoft/fabric-visuals";
import type { VegaVisualHandle } from "@microsoft/fabric-visuals";
import { DataGrid } from "@microsoft/fabric-datagrid";
import { DropdownSlicer } from "@microsoft/fabric-slicers";
import type { DataTable } from "@microsoft/fabric-visuals-core";
import { useManagedInteractionSource } from "@microsoft/fabric-interaction-manager/react";
import { useThemeContext } from "@/hooks/theme.context";
import { useQueryFactoryTarget } from "@/hooks/use-query-factory-target";
import type { QueryFactoryTargetState } from "@/hooks/use-query-factory-target";
import { clearQueryCache } from "@/hooks/use-semantic-model-query";
import { dimensionLabel, monthLabel, selectedValues, selection } from "@/lib/report-state";
import type { BarField, BarSelection, DimensionValue } from "@/lib/report-state";
import { accounts, detailRows, detailTotals, kpis, months, productTypes, systems, trend, trendDisplayParams, types } from "@/queries";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });
const emptyMessage = "No sales for this selection";

function cell(table: DataTable, name: string, row = 0): unknown {
    const index = table.columns.findIndex(column => column.name === name);
    if (index < 0) throw new Error(`The model did not return ${name}.`);
    return table.rows[row]?.[index] ?? null;
}

function metric(table: DataTable, name: string): number | null {
    const value = cell(table, name);
    if (value === null) return null;
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid numeric ${name} returned by the model.`);
    return value;
}

function useRetry() {
    const [retry, setRetry] = useState(0);
    return {
        retry,
        refetch: () => {
            clearQueryCache();
            setRetry(value => value + 1);
        },
    };
}

export function QueryContent({ result, retry, label, children }: {
    result: QueryFactoryTargetState<DataTable>;
    retry: () => void;
    label: string;
    children: (table: DataTable) => ReactNode;
}) {
    if (result.status === "loading" || result.status === "refreshing") {
        return <p role="status" className="motion-safe:animate-pulse rounded-lg border border-border bg-muted p-6">Loading {label}...</p>;
    }
    if (result.status === "error" || result.status === "refresh-error") {
        return <div role="alert" className="rounded-lg border border-destructive p-4 text-destructive">
            <p>{label} could not load. {result.error.message}</p>
            <p>Previous values are not shown for this selection.</p>
            <button type="button" className="sp-button mt-3" onClick={retry}>Retry {label}</button>
        </div>;
    }
    return <ErrorBoundary resetKeys={[result.data]} fallbackRender={({ error }) =>
        <div role="alert" className="rounded-lg border border-destructive p-4 text-destructive">
            <p>{label} could not render. {error instanceof Error ? error.message : String(error)}</p>
            <button type="button" className="sp-button mt-3" onClick={retry}>Retry {label}</button>
        </div>
    }><RenderedQuery table={result.data}>{children}</RenderedQuery></ErrorBoundary>;
}

function RenderedQuery({ table, children }: { table: DataTable; children: (table: DataTable) => ReactNode }) {
    return children(table);
}

export function MonthControl() {
    const { retry, refetch } = useRetry();
    const result = useQueryFactoryTarget("month", months, { retry });
    const source = useManagedInteractionSource("month");
    const selected = selectedValues(source.selections, "Month")?.[0];
    return <QueryContent result={result} retry={refetch} label="months">{table =>
        <label className="flex flex-col gap-2 text-200 font-semibold">
            Month
            <select className="rounded-md border border-border bg-card p-3 text-300 text-foreground"
                required aria-label="Month" value={selected ?? ""}
                onChange={event => source.onInteraction([{ action: "select", selections: selection("Month", [event.target.value]) }])}>
                {table.rows.map((_, index) => {
                    const value = cell(table, "Month", index);
                    return typeof value === "string" ? <option value={value} key={value}>{monthLabel(value)}</option> : null;
                })}
            </select>
            {source.error && <span role="alert" className="text-destructive">{source.error.message}</span>}
        </label>
    }</QueryContent>;
}

export function DimensionControl({ kind }: { kind: "where" | "what" }) {
    const { retry, refetch } = useRetry();
    const field = kind === "where" ? "System" : "Type";
    const title = kind === "where" ? "Where · System" : "What · Product type";
    const result = useQueryFactoryTarget(kind, kind === "where" ? systems : types, { retry });
    const source = useManagedInteractionSource(kind);
    const { theme } = useThemeContext();
    const selected = selectedValues(source.selections, field);
    return <QueryContent result={result} retry={refetch} label={title}>{table => {
        const values = table.rows.map((_, index) => {
            const value = cell(table, field, index);
            if (value !== null && typeof value !== "string") throw new Error(`Invalid ${field} member returned by the model.`);
            return value;
        });
        const setValues = (next: readonly DimensionValue[]) => source.onInteraction(
            next.length === values.length ? [{ action: "clear" }] : [{ action: "select", selections: selection(field, next) }],
        );
        return <div className="space-y-2">
            {kind === "where" && values.includes(null) ? <details className="rounded-md border border-border bg-card p-3">
                <summary className="cursor-pointer text-200 font-semibold">{title} · {selected === null ? "All" : selected.length ? `${selected.length} selected` : "None"}</summary>
                <fieldset className="mt-3 flex flex-col gap-2 text-300">
                    <legend className="sr-only">{title}</legend>
                    <button className="sp-button" type="button" onClick={() => source.onInteraction([{ action: "clear" }])}>Select all</button>
                    {values.map((value, index) => <label key={index} className="flex items-center gap-2">
                        <input type="checkbox" checked={selected === null || selected.includes(value)} onChange={event => {
                            const current = selected ?? values;
                            setValues(event.target.checked ? [...current, value] : current.filter(item => item !== value));
                        }} />
                        {value === null ? "(Unassigned station)" : dimensionLabel(value)}
                    </label>)}
                </fieldset>
            </details> : <DropdownSlicer data={table} column={field} title={title} theme={theme}
                selection={selected} onInteraction={source.onInteraction} />}
            {source.error && <p role="alert" className="text-destructive">{source.error.message}</p>}
        </div>;
    }}</QueryContent>;
}

export function Kpis() {
    const { retry, refetch } = useRetry();
    const result = useQueryFactoryTarget("kpis", kpis, { retry });
    const { theme } = useThemeContext();
    return <QueryContent result={result} retry={refetch} label="performance cards">{table => {
        const lines = metric(table, "Lines");
        const noLines = lines === null || lines === 0;
        const returns = metric(table, "Returns");
        const returnsPct = metric(table, "ReturnsPct");
        const otd = metric(table, "OTD");
        const change = metric(table, "OTDChangePP");
        const budget = metric(table, "Budget");
        const attainment = metric(table, "Attainment");
        const gap = metric(table, "BudgetGap");
        const comparison = budget === null ? "No comparison: no budget" : budget <= 0 ? "No comparison: budget ≤ 0" : undefined;
        const date = cell(table, "SourceLastDate");
        if (typeof date !== "string") throw new Error("Missing billing data-through date.");
        const unconverted = metric(table, "UnconvertedLines");
        if (unconverted === null && !noLines) throw new Error("Missing FX completeness result.");
        const cards = [
            { name: "Sales", title: "Net sales", value: metric(table, "Sales"), format: "€ #,0.0;(€ #,0.0);€0", compact: true, context: budget === null ? "No comparison: no budget" : `vs budget ${money.format(budget)}` },
            { name: "Budget", title: "Budget attainment", value: attainment, format: "0.0%", compact: false, context: [comparison, gap === null ? null : `Gap ${money.format(gap)}`].filter(Boolean).join(" · ") },
            {
                name: "OTD", title: "On-time delivery", value: otd, format: "0.0%", compact: false,
                context: otd !== null && change !== null ? `vs prior month ${change < 0 ? "▼" : "▲"} ${change >= 0 ? "+" : ""}${change.toFixed(1)} pp` : "No comparison: prior-month OTD unavailable",
            },
            {
                name: "Returns", title: "Returns & warranty",
                value: returns,
                format: "€ #,0.0;(€ #,0.0);€0", compact: true,
                context: returnsPct !== null ? `${(returnsPct * 100).toFixed(1)}% of invoiced` : "No comparison: no invoiced sales",
            },
        ];
        return <div className="space-y-3">
            <p className="text-200 text-muted-foreground">Billing data through {date.slice(0, 10)} · Aug 2022 partial, not selectable</p>
            {unconverted !== null && unconverted > 0 && <p role="alert" className="rounded-md border border-destructive p-3 text-destructive">{unconverted.toLocaleString("en-US")} lines have no usable FX rate; EUR totals are incomplete.</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(card => <div key={card.name} className="space-y-2">
                    <KpiCard theme={theme} header={{ title: card.title }} callout={{
                        metric: { value: noLines ? null : card.value, format: card.format, displayUnits: card.compact ? "compact" : undefined },
                    }} />
                    <p className="px-3 text-200 text-muted-foreground">{noLines ? emptyMessage : card.context}</p>
                </div>)}
            </div>
        </div>;
    }}</QueryContent>;
}

export function Trend() {
    const { retry, refetch } = useRetry();
    const result = useQueryFactoryTarget("trend", trend, { retry });
    const { theme } = useThemeContext();
    return <div className="h-[380px] min-w-0"><QueryContent result={result} retry={refetch} label="fixed sales trend">{table =>
        table.rows.some((_, index) => typeof cell(table, "Sales", index) === "number")
            ? <VegaVisual data={table} theme={theme} spec={trend(trendDisplayParams(table)).vegaLiteSpec}
                capabilities={{ disableSelfHighlight: true }} selectableFields={[]}
                header={{ title: "Net sales vs Budget · latest 24 complete months", subtitle: "Aug 2020–Jul 2022 · ignores Month only · returns & warranty on right axis" }} />
            : <p className="rounded-lg border border-border p-6">{emptyMessage}</p>
    }</QueryContent></div>;
}

export function Breakdown({ field, onDrill }: { field: BarField; onDrill: (item: BarSelection) => void }) {
    const { retry, refetch } = useRetry();
    const id = field === "KeyAccount" ? "accounts" : "types";
    const factory = field === "KeyAccount" ? accounts : productTypes;
    const result = useQueryFactoryTarget(id, factory, { retry });
    const source = useManagedInteractionSource(id);
    const { theme } = useThemeContext();
    const visualRef = useRef<VegaVisualHandle>(null);
    const detach = useRef<(() => void) | undefined>(undefined);
    const [contextItem, setContextItem] = useState<BarSelection>();
    useEffect(() => () => detach.current?.(), []);
    const bindContextMenu = () => {
        const view = visualRef.current?.view;
        if (!view) return;
        detach.current?.();
        const handler: Parameters<typeof view.addEventListener>[1] = (event, item) => {
            const datum: unknown = item?.datum;
            if (typeof datum !== "object" || datum === null || !(field in datum)) return;
            const value: unknown = Reflect.get(datum, field);
            if (value !== null && typeof value !== "string") return;
            event.preventDefault();
            setContextItem({ field, value });
        };
        view.addEventListener("contextmenu", handler);
        detach.current = () => view.removeEventListener("contextmenu", handler);
    };
    const contextValid = result.status === "ready" && contextItem !== undefined &&
        result.data.rows.some((_, index) => cell(result.data, field, index) === contextItem.value);
    return <section className="min-w-0 space-y-3" aria-label={`${field} breakdown`}>
        <div className="h-[540px]"><QueryContent result={result} retry={refetch} label={`${field} breakdown`}>{table =>
            table.rows.length ? <VegaVisual ref={visualRef} data={table} theme={theme} spec={factory().vegaLiteSpec}
                header={{ title: field === "KeyAccount" ? "Who · Key account" : "What · Product type", subtitle: "Net EUR · positive-budget markers · click to filter · right-click for details" }}
                selections={source.selections} selectableFields={source.selectableFields} onInteraction={source.onInteraction}
                onEvent={event => { if (event.detail.type === "render") bindContextMenu(); }} />
                : <p className="rounded-lg border border-border p-6">{emptyMessage}</p>
        }</QueryContent></div>
        {source.error && <p role="alert" className="text-destructive">{source.error.message}</p>}
        {contextValid && <div role="menu" aria-label={`Actions for ${dimensionLabel(contextItem.value)}`} className="flex flex-wrap gap-2">
            <button type="button" role="menuitem" className="sp-button" onClick={() => {
                onDrill(contextItem);
                setContextItem(undefined);
            }}>View details · {dimensionLabel(contextItem.value)}</button>
            <button type="button" role="menuitem" className="sp-button" onClick={() => setContextItem(undefined)}>Close</button>
        </div>}
        {result.status === "ready" && result.data.rows.length > 0 && <details className="text-200">
            <summary className="cursor-pointer text-brand-foreground">View details without changing the selected bar</summary>
            <div className="flex flex-wrap gap-2 py-2">{result.data.rows.map((_, index) => {
                const value = cell(result.data, field, index);
                return value === null || typeof value === "string" ? <button type="button" className="sp-button" key={index}
                    onClick={() => onDrill({ field, value })}>View details · {dimensionLabel(value)}</button> : null;
            })}</div>
        </details>}
        {field === "KeyAccount" && <p className="text-200 text-muted-foreground">No Key Account, Government Contract and Private Contract are customer groupings, not single accounts.</p>}
    </section>;
}

export function Detail() {
    const { retry, refetch } = useRetry();
    const rowsResult = useQueryFactoryTarget("detailRows", detailRows, { retry });
    const totalsResult = useQueryFactoryTarget("detailTotals", detailTotals, { retry });
    const { theme } = useThemeContext();
    return <QueryContent result={rowsResult} retry={refetch} label="invoice lines">{rows =>
        <QueryContent result={totalsResult} retry={refetch} label="full matching totals">{totals => {
            const count = metric(totals, "Lines") ?? 0;
            if (rows.rows.length > 500 || rows.rows.length !== Math.min(500, count)) {
                throw new Error("Bounded invoice rows do not reconcile with the full matching row count.");
            }
            const visibleIndexes = rows.columns.flatMap((column, index) => column.name === "RowId" ? [] : [index]);
            const visible: DataTable = {
                columns: visibleIndexes.map(index => rows.columns[index]),
                rows: rows.rows.map(row => visibleIndexes.map(index => row[index])),
            };
            const sales = metric(totals, "Sales");
            const quantity = metric(totals, "Quantity");
            return <section className="space-y-4">
                <p className="font-semibold" aria-live="polite">Showing {rows.rows.length.toLocaleString("en-US")} of {count.toLocaleString("en-US")} lines</p>
                <p className="text-200 text-muted-foreground">First 500 maximum, ordered by billing date, document, line and unique ingestion identity. Totals cover all matching lines, not this page. No unbounded export.</p>
                <dl className="flex flex-wrap gap-8 rounded-lg border border-border bg-card p-4" aria-label="All matching invoice totals">
                    <div><dt className="text-200 text-muted-foreground">All matching net EUR</dt><dd className="text-400 font-semibold">{sales === null ? "—" : money.format(sales)}</dd></div>
                    <div><dt className="text-200 text-muted-foreground">All matching net quantity</dt><dd className="text-400 font-semibold">{quantity === null ? "—" : quantity.toLocaleString("en-US")}</dd></div>
                </dl>
                {rows.rows.length ? <div className="h-[620px] min-w-0">
                    <DataGrid theme={theme} data={visible}
                        capabilities={{ disableFiltering: true, disableSorting: true, disableSelection: true, pagination: 100 }}
                        header={{ title: "Physical invoice-line detail", subtitle: "All document types · local value ÷ local units per EUR · no product-grain Budget" }} />
                </div> : <p className="rounded-lg border border-border p-6">{emptyMessage}</p>}
            </section>;
        }}</QueryContent>
    }</QueryContent>;
}
