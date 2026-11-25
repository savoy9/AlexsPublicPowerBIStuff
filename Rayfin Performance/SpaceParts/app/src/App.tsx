//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { InteractionManagerProvider, useInteractionManager, useManagedInteractionSource } from "@microsoft/fabric-interaction-manager/react";
import { useThemeContext } from "@/hooks/theme.context";
import { Breakdown, Detail, DimensionControl, Kpis, MonthControl, Trend } from "@/components/report-widgets";
import { createReportManager, defaultReportState, detailContext, dimensionLabel, monthLabel, readReportLink, reportHash, restoreReportState, selectedValues, selection } from "@/lib/report-state";
import type { BarSelection, ReportState } from "@/lib/report-state";

function DrillThroughDetail({ reportLink }: { reportLink: string }) {
    const manager = useMemo(() => createReportManager(detailContext(readReportLink(reportLink).state)), [reportLink]);
    return <InteractionManagerProvider manager={manager}><Detail /></InteractionManagerProvider>;
}

function Report({ initial }: { initial: ReturnType<typeof readReportLink> }) {
    const manager = useInteractionManager();
    const monthSource = useManagedInteractionSource("month");
    const whereSource = useManagedInteractionSource("where");
    const whatSource = useManagedInteractionSource("what");
    const accountSource = useManagedInteractionSource("accounts");
    const typeSource = useManagedInteractionSource("types");
    const drillSource = useManagedInteractionSource("drill");
    const { isDark, toggleTheme } = useThemeContext();
    const [linkError, setLinkError] = useState(initial.error);
    const [page, setPage] = useState<ReportState["page"]>(initial.state.page);
    const [copyStatus, setCopyStatus] = useState("");
    const month = selectedValues(monthSource.selections, "Month")?.[0];
    const where = selectedValues(whereSource.selections, "System");
    const what = selectedValues(whatSource.selections, "Type");
    const account = selectedValues(accountSource.selections, "KeyAccount");
    const type = selectedValues(typeSource.selections, "Type");
    const drillAccount = selectedValues(drillSource.selections, "KeyAccount");
    const drillType = selectedValues(drillSource.selections, "Type");
    const selectedBar: BarSelection | undefined = account?.length ? { field: "KeyAccount", value: account[0] } :
        type?.length ? { field: "Type", value: type[0] } : undefined;
    const drill: BarSelection | undefined = drillAccount?.length ? { field: "KeyAccount", value: drillAccount[0] } :
        drillType?.length ? { field: "Type", value: drillType[0] } : undefined;
    const stateHash = month ? reportHash({ month, where, what, selectedBar, page, ...(page === "detail" ? { drill } : {}) }) : "";

    useEffect(() => {
        if (!month) return;
        const next = new URL(window.location.href);
        next.hash = stateHash;
        window.history.replaceState(null, "", next);
    }, [month, stateHash]);

    useEffect(() => {
        const restore = () => {
            const restored = readReportLink(window.location.hash);
            restoreReportState(manager, restored.state);
            setLinkError(restored.error);
            setPage(restored.state.page);
        };
        window.addEventListener("popstate", restore);
        return () => window.removeEventListener("popstate", restore);
    }, [manager]);

    const openDetail = (item: BarSelection) => {
        manager.replaceSourceSelection("drill", selection(item.field, [item.value]));
        setPage("detail");
    };
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopyStatus("View link copied. Workspace access is still required.");
        } catch (error) {
            setCopyStatus(`Could not copy the link: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return <main className="mx-auto w-full max-w-report space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div className="space-y-2">
                <p className="text-200 font-semibold tracking-widest text-brand-foreground">SPACEPARTS · BILLING PERFORMANCE</p>
                <h1 className="font-page-title text-page-title text-emphasis-foreground">Sales vs Budget</h1>
                <p className="font-page-subtitle text-page-subtitle">{month && monthLabel(month)} · EUR @ budget rate (local ÷ rate)</p>
                <p className="text-200 text-muted-foreground">Billing date · net invoice value · excl. freight, penalties &amp; tax</p>
            </div>
            <div className="flex gap-2">
                <button type="button" className="sp-button" onClick={() => void copyLink()}>Copy view link</button>
                <button type="button" className="sp-button" onClick={toggleTheme}>{isDark ? "Light" : "Dark"} mode</button>
                <button type="button" className="sp-button" onClick={() => {
                    restoreReportState(manager, defaultReportState);
                    setLinkError(undefined);
                    setPage("overview");
                    setCopyStatus("");
                }}>Reset</button>
            </div>
        </header>
        {copyStatus && <p role="status" className="text-200">{copyStatus}</p>}
        {linkError && <p role="alert" className="text-destructive">{linkError}</p>}
        {!month ? <p role="alert" className="text-destructive">A single complete Month is required. Reset restores July 2022.</p> : page === "overview" ? <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Report filters">
                <MonthControl />
                <DimensionControl kind="where" />
                <DimensionControl kind="what" />
            </section>
            {selectedBar && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted p-3" aria-live="polite">
                <span>Cross-filter: {selectedBar.field} · {dimensionLabel(selectedBar.value)}</span>
                <button type="button" className="sp-button" onClick={() => manager.clearSource(selectedBar.field === "KeyAccount" ? "accounts" : "types")}>Clear bar</button>
            </div>}
            <Kpis />
            <Trend />
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-label="Performance breakdowns">
                <Breakdown field="KeyAccount" onDrill={openDetail} />
                <Breakdown field="Type" onDrill={openDetail} />
            </section>
        </> : <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-500">Invoice-line detail</h2>
                <button type="button" className="sp-button" onClick={() => {
                    manager.clearSource("drill");
                    setPage("overview");
                }}>← Back to overview</button>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Carried-over filters">
                {[
                    monthLabel(month),
                    where === null ? "All systems" : where.length ? where.map(dimensionLabel).join(", ") : "No systems",
                    what === null ? "All types" : what.length ? what.map(dimensionLabel).join(", ") : "No types",
                    selectedBar && selectedBar.field !== drill?.field && `${selectedBar.field}: ${dimensionLabel(selectedBar.value)}`,
                    drill && `${drill.field}: ${dimensionLabel(drill.value)}`,
                ].filter(Boolean).map((label, index) => <span className="rounded-full border border-border bg-muted px-3 py-1 text-200" key={index}>{label}</span>)}
            </div>
            {drill ? <DrillThroughDetail reportLink={stateHash} /> : <p role="alert" className="text-destructive">Detail is available only through a key-account or type bar. Return to Overview.</p>}
        </>}
        <footer className="border-t border-border pt-4 text-200 text-muted-foreground">
            Full source-backed Invoices + Budget · same semantic model as the paired Power BI report · no personal manager/director or employee fields · COGS and margin deferred · Z2 is Other, not cancellation
        </footer>
    </main>;
}

function App() {
    const [initial] = useState(() => readReportLink(window.location.hash));
    const [manager] = useState(() => createReportManager(initial.state));
    return <InteractionManagerProvider manager={manager}><Report initial={initial} /></InteractionManagerProvider>;
}

export default App;
