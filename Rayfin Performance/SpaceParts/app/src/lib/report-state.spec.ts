import { describe, expect, it } from "vitest";
import { compileDaxFilters } from "@microsoft/fabric-interaction-manager";
import { createReportManager, defaultReportState, detailContext, readReportLink, reportHash, selectedValues } from "./report-state";
import type { ReportState } from "./report-state";

function filters(state: ReportState, target: string) {
    const manager = createReportManager(state);
    return compileDaxFilters(manager.configuration, manager.getTargetState(target)).getFilters("baseline").join("\n");
}

describe("replayable SpaceParts interactions", () => {
    it("preserves All, None and the actual unmatched System member as distinct semantic filters", () => {
        const all = { ...defaultReportState, where: null };
        const none = { ...defaultReportState, where: [] };
        const blank = { ...defaultReportState, where: [null] };
        expect(filters(all, "kpis")).not.toContain("'Regions'[System]");
        expect(filters(blank, "kpis")).toContain("'Regions'[System]");
        expect(filters(blank, "kpis")).toMatch(/BLANK/);
        expect(filters(none, "kpis")).not.toEqual(filters(blank, "kpis"));
        expect(readReportLink(reportHash(blank))).toEqual({ state: blank });
        const manager = createReportManager(blank);
        expect(selectedValues(manager.getSourceSelection("where"), "System")).toEqual([null]);
    });

    it("keeps the fixed trend identical across month changes while preserving System, Type and account filters", () => {
        const state: ReportState = {
            ...defaultReportState,
            where: ["Îlos System"],
            what: ["Hull & Shields"],
            selectedBar: { field: "KeyAccount", value: "No Key Account" },
        };
        const july = filters(state, "trend");
        expect(july).toEqual(filters({ ...state, month: "2022-04" }, "trend"));
        expect(july).not.toContain("'Date'[Year Month]");
        expect(july).toContain("Îlos System");
        expect(july).toContain("Hull & Shields");
        expect(july).toContain("No Key Account");
    });

    it("replaces a same-field bar only in the drill context and preserves a different-field bar", () => {
        const state: ReportState = {
            ...defaultReportState,
            selectedBar: { field: "KeyAccount", value: "No Key Account" },
            page: "detail",
            drill: { field: "KeyAccount", value: "Elysium Aerospace" },
        };
        const detail = filters(detailContext(state), "detailRows");
        expect(detail).toContain("Elysium Aerospace");
        expect(detail).not.toContain("No Key Account");
        expect(filters({ ...state, page: "overview", drill: undefined }, "kpis")).toContain("No Key Account");
        const crossField = filters(detailContext({ ...state, drill: { field: "Type", value: "Hull & Shields" } }), "detailRows");
        expect(crossField).toContain("No Key Account");
        expect(crossField).toContain("Hull & Shields");
    });
});
