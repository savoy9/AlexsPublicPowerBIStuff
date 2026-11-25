import { InteractionManager } from "@microsoft/fabric-interaction-manager";
import type { SemanticSelection } from "@microsoft/fabric-visuals-core";

export type DimensionValue = string | null;
export type BarField = "KeyAccount" | "Type";
export interface BarSelection {
    field: BarField;
    value: DimensionValue;
}

export interface ReportState {
    month: string;
    where: readonly DimensionValue[] | null;
    what: readonly DimensionValue[] | null;
    selectedBar?: BarSelection;
    page: "overview" | "detail";
    drill?: BarSelection;
}

export const defaultReportState: ReportState = {
    month: "2022-07",
    where: null,
    what: null,
    page: "overview",
};

export function monthLabel(value: string) {
    return new Date(`${value}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function dimensionLabel(value: DimensionValue) {
    return value === null ? "(Blank)" : value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDimension(value: unknown): value is DimensionValue {
    return value === null || (typeof value === "string" && value.length <= 200);
}

function isSet(value: unknown): value is DimensionValue[] | null {
    return value === null || (Array.isArray(value) && value.length <= 20 && value.every(isDimension));
}

function isBar(value: unknown): value is BarSelection {
    return isRecord(value) && (value.field === "KeyAccount" || value.field === "Type") && isDimension(value.value);
}

export function readReportLink(hash: string): { state: ReportState; error?: string } {
    const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("report");
    if (!encoded) return { state: defaultReportState };
    try {
        const value: unknown = JSON.parse(encoded);
        if (!isRecord(value) || typeof value.month !== "string" ||
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month) ||
            value.month < "2018-01" || value.month > "2022-07" ||
            !isSet(value.where) || !isSet(value.what) ||
            (value.page !== "overview" && value.page !== "detail") ||
            (value.selectedBar !== undefined && !isBar(value.selectedBar)) ||
            (value.drill !== undefined && !isBar(value.drill)) ||
            (value.page === "detail" && value.drill === undefined)) {
            return { state: defaultReportState, error: "Invalid report link. The default view is shown; Reset clears this warning." };
        }
        return {
            state: {
                month: value.month,
                where: value.where,
                what: value.what,
                page: value.page,
                selectedBar: value.selectedBar,
                drill: value.drill,
            },
        };
    } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        return { state: defaultReportState, error: "The report link could not be decoded. The default view is shown." };
    }
}

export function reportHash(state: ReportState) {
    return JSON.stringify(state) === JSON.stringify(defaultReportState)
        ? ""
        : `#${new URLSearchParams({ report: JSON.stringify(state) })}`;
}

export function detailContext(state: ReportState): ReportState {
    return state.page === "detail" && state.drill?.field === state.selectedBar?.field
        ? { ...state, selectedBar: undefined }
        : state;
}

export function selection(fieldId: string, values: readonly DimensionValue[]): readonly SemanticSelection[] {
    return [{
        predicates: [{
            type: "set",
            fieldId,
            values: values.map(value => value === null ? { kind: "blank" } : { kind: "value", value }),
        }],
    }];
}

export function selectedValues(selections: readonly SemanticSelection[], fieldId: string): DimensionValue[] | null {
    if (selections.length === 0) return null;
    return selections.flatMap(item => item.predicates.flatMap(predicate =>
        predicate.type === "set" && predicate.fieldId === fieldId
            ? predicate.values.flatMap<DimensionValue>(value =>
                value.kind === "blank" ? [null] : typeof value.value === "string" ? [value.value] : [])
            : [],
    ));
}

export function restoreReportState(manager: InteractionManager, state: ReportState) {
    manager.clearAll();
    manager.replaceSourceSelection("month", selection("Month", [state.month]));
    if (state.where !== null) manager.replaceSourceSelection("where", selection("System", state.where));
    if (state.what !== null) manager.replaceSourceSelection("what", selection("Type", state.what));
    if (state.selectedBar) {
        manager.replaceSourceSelection(state.selectedBar.field === "KeyAccount" ? "accounts" : "types",
            selection(state.selectedBar.field, [state.selectedBar.value]));
    }
    if (state.page === "detail" && state.drill) {
        manager.replaceSourceSelection("drill", selection(state.drill.field, [state.drill.value]));
    }
}

export function createReportManager(state: ReportState): InteractionManager {
    const manager = new InteractionManager({
        semanticModelId: import.meta.env.VITE_SPACEPARTS_MODEL_ID || "spaceparts-example",
        fields: {
            Month: { table: "Date", column: "Year Month", dataType: "string" },
            System: { table: "Regions", column: "System", dataType: "string" },
            Type: { table: "Product Type", column: "Type", dataType: "string" },
            KeyAccount: { table: "Customers", column: "Key Account Name", dataType: "string" },
        },
        components: {
            month: { kind: "slicer", selectableFields: ["Month"], receivesInteractionsByDefault: false },
            where: { kind: "slicer", selectableFields: ["System"], receivesInteractionsByDefault: false },
            what: { kind: "slicer", selectableFields: ["Type"], receivesInteractionsByDefault: false },
            accounts: { kind: "visual", selectableFields: ["KeyAccount"], canHighlight: false },
            types: { kind: "visual", selectableFields: ["Type"], canHighlight: false },
            trend: { kind: "visual", selectableFields: [], canHighlight: false },
            kpis: { kind: "custom", selectableFields: [], sourceEffect: "filter", canFilter: true, canHighlight: false },
            detailRows: { kind: "grid", selectableFields: [], canHighlight: false },
            detailTotals: { kind: "custom", selectableFields: [], sourceEffect: "filter", canFilter: true, canHighlight: false },
            drill: {
                kind: "custom", selectableFields: ["KeyAccount", "Type"], sourceEffect: "filter",
                canFilter: false, canHighlight: false, receivesInteractionsByDefault: false,
            },
        },
        rules: [
            { sourceId: "month", targetId: "trend", targetEffect: "none" },
            ...["kpis", "trend", "accounts", "types"].map(targetId => ({
                sourceId: "drill", targetId, targetEffect: "none" as const,
            })),
        ],
    });
    restoreReportState(manager, state);
    return manager;
}
