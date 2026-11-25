//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "@/App";
import { ReportTestTheme } from "@/test/report-theme";

const queryState = vi.hoisted((): {
    empty: boolean;
    kpis: { invoiced: number | null; returns: number | null; share: number | null } | null;
} => ({ empty: false, kpis: null }));
vi.mock("@/hooks/use-query-factory-target", () => ({
    useQueryFactoryTarget: (target: string) => {
        if (["month", "where", "what"].includes(target) || (!queryState.empty && !queryState.kpis)) return { status: "loading" };
        if (target !== "kpis") return queryState.empty ? { status: "ready", data: { columns: [], rows: [] } } : { status: "loading" };
        const fields = ["Sales", "Invoiced", "Returns", "ReturnsPct", "OTD", "OTDChangePP", "Lines", "Quantity", "UnconvertedLines", "SourceLastDate", "Budget", "Attainment", "BudgetGap"];
        const values: Record<string, unknown> = {
            SourceLastDate: "2022-08-21T00:00:00.000",
            ...(queryState.kpis ? {
                Lines: 1,
                UnconvertedLines: 0,
                Invoiced: queryState.kpis.invoiced,
                Returns: queryState.kpis.returns,
                ReturnsPct: queryState.kpis.share,
            } : {}),
        };
        return {
            status: "ready",
            data: {
                columns: fields.map(name => ({ name })),
                rows: [fields.map(name => values[name] ?? null)],
            },
        };
    },
}));

describe("App", () => {
    it("renders without throwing", () => {
        expect(() => render(<ReportTestTheme><App /></ReportTestTheme>)).not.toThrow();
    });

    it("mounts content into the document", () => {
        render(<ReportTestTheme><App /></ReportTestTheme>);
        expect(document.body).not.toBeEmptyDOMElement();
    });

    it("only animates loading when reduced motion is not requested", () => {
        render(<ReportTestTheme><App /></ReportTestTheme>);
        for (const status of screen.getAllByRole("status")) {
            expect(status).toHaveClass("motion-safe:animate-pulse");
            expect(status).not.toHaveClass("animate-pulse");
        }
    });

    it.each([
        { invoiced: null, returns: -20, share: null, label: "No comparison: no invoiced sales" },
        { invoiced: 0, returns: -20, share: null, label: "No comparison: no invoiced sales" },
        { invoiced: 100, returns: 0, share: 0, label: "0.0% of invoiced" },
        { invoiced: -100, returns: -20, share: -0.2, label: "-20.0% of invoiced" },
    ])("uses the shared R&W result with invoiced=$invoiced, share=$share", ({ label, ...metrics }) => {
        queryState.kpis = metrics;
        try {
            render(<ReportTestTheme><App /></ReportTestTheme>);
            expect(screen.getByText(label)).toBeInTheDocument();
            expect(screen.queryByText("No comparison: no invoiced value")).not.toBeInTheDocument();
        } finally {
            queryState.kpis = null;
        }
    });

    it("renders a genuine empty selection without fabricated zeros or a query error", () => {
        queryState.empty = true;
        try {
            render(<ReportTestTheme><App /></ReportTestTheme>);
            expect(screen.getAllByText("No sales for this selection").length).toBeGreaterThanOrEqual(4);
            expect(screen.queryByRole("alert")).not.toBeInTheDocument();
            expect(screen.queryByText("0.0% of invoiced")).not.toBeInTheDocument();
        } finally {
            queryState.empty = false;
        }
    });
});
