import type { ManagedQueryFactoryParams } from "@microsoft/fabric-interaction-manager";
import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { DataTable } from "@microsoft/fabric-visuals-core";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { insertInteractionFilters } from "@/lib/query-factory";
import invoiceKpisQuery from "./invoice-kpis.dax?raw";
import budgetKpisQuery from "./kpis-budget.dax?raw";
import monthsQuery from "./months.dax?raw";
import systemsQuery from "./systems.dax?raw";
import typesQuery from "./types.dax?raw";
import trendQuery from "./trend.dax?raw";
import accountsQuery from "./accounts.dax?raw";
import productTypesQuery from "./product-types.dax?raw";
import trendSpec from "./trend.json";
import accountsSpec from "./accounts.json";
import productTypesSpec from "./product-types.json";

export interface QueryParams extends ManagedQueryFactoryParams {
    retry?: number;
}

export const connection = "salesmodel";
export const moneyFormat = "€ #,0.00;(€ #,0.00)";
export const percentFormat = "0.0%";
export const invoiceKpiMetadata: ColumnMetadataMap = {
    "[Sales]": { name: "Sales", displayName: "Net sales", format: moneyFormat },
    "[Invoiced]": { name: "Invoiced", displayName: "Invoiced value", format: moneyFormat },
    "[Returns]": { name: "Returns", displayName: "Returns & warranty", format: moneyFormat },
    "[ReturnsPct]": { name: "ReturnsPct", displayName: "Returns & warranty share", format: percentFormat },
    "[OTD]": { name: "OTD", displayName: "On-time delivery", format: percentFormat },
    "[OTDChangePP]": { name: "OTDChangePP", displayName: "Change vs prior month", format: '0.0" pp"' },
    "[Lines]": { name: "Lines", displayName: "Invoice lines", format: "#,0" },
    "[Quantity]": { name: "Quantity", displayName: "Net quantity", format: "#,0" },
    "[UnconvertedLines]": { name: "UnconvertedLines", displayName: "Lines without conversion", format: "#,0" },
    "[SourceLastDate]": { name: "SourceLastDate", displayName: "Billing data through", format: "yyyy-MM-dd" },
};

const budgetMetadata: ColumnMetadataMap = {
    "[Budget]": { name: "Budget", displayName: "Budget EUR", format: moneyFormat },
    "[Attainment]": { name: "Attainment", displayName: "Budget attainment", format: percentFormat },
    "[BudgetGap]": { name: "BudgetGap", displayName: "Gap EUR", format: moneyFormat },
};

export function invoiceKpis({ interactionFilters = [] }: QueryParams = {}) {
    return {
        connection,
        query: insertInteractionFilters(invoiceKpisQuery, interactionFilters, "/*__FILTER_ARGUMENTS__*/", "afterTable"),
        columnMetadata: invoiceKpiMetadata,
    };
}

export function kpis({ interactionFilters = [] }: QueryParams = {}) {
    return {
        connection,
        query: insertInteractionFilters(budgetKpisQuery, interactionFilters, "/*__FILTER_ARGUMENTS__*/", "afterTable"),
        columnMetadata: { ...invoiceKpiMetadata, ...budgetMetadata },
    };
}

export function months() {
    return {
        connection,
        query: monthsQuery,
        columnMetadata: {
            "Date[Year Month]": { name: "Month", displayName: "Billing month" },
            "Date[Month Start]": { name: "MonthStart" },
            "[Lines]": invoiceKpiMetadata["[Lines]"],
        },
    };
}

export function systems() {
    return {
        connection,
        query: systemsQuery,
        columnMetadata: {
            "Regions[System]": { name: "System", displayName: "System" },
            "[Lines]": invoiceKpiMetadata["[Lines]"],
        },
    };
}

export function types() {
    return {
        connection,
        query: typesQuery,
        columnMetadata: {
            "Product Type[Type]": { name: "Type", displayName: "Product type" },
            "[Lines]": invoiceKpiMetadata["[Lines]"],
        },
    };
}

const chartMetadata: ColumnMetadataMap = {
    ...budgetMetadata,
    "[Sales]": invoiceKpiMetadata["[Sales]"],
    "[OTD]": invoiceKpiMetadata["[OTD]"],
    "[ReturnsPct]": invoiceKpiMetadata["[ReturnsPct]"],
    "[Lines]": invoiceKpiMetadata["[Lines]"],
};

export function trendEurDomain(table: DataTable): [number, number] {
    let minimum = 0;
    let maximum = 0;
    for (const field of ["Sales", "Budget"]) {
        const index = table.columns.findIndex(column => column.name === field);
        if (index < 0) throw new Error(`Missing trend ${field}.`);
        for (const row of table.rows) {
            const value = row[index];
            if (value === null) continue;
            if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid trend ${field}.`);
            minimum = Math.min(minimum, value);
            maximum = Math.max(maximum, value);
        }
    }
    return minimum === maximum ? [minimum, minimum + 1] : [minimum, maximum];
}

export function trendDisplayParams(table: DataTable) {
    const index = table.columns.findIndex(column => column.name === "Month");
    if (index < 0) throw new Error("Missing trend calendar month.");
    const axisMonths = table.rows.map(row => {
        const month = row[index];
        if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid trend calendar month.");
        return month;
    });
    if (axisMonths.length !== 24 || new Set(axisMonths).size !== 24) throw new Error("The fixed trend requires 24 distinct calendar months.");
    return { eurDomain: trendEurDomain(table), axisMonths };
}

export function trend({ interactionFilters = [], eurDomain, axisMonths }: QueryParams & { eurDomain?: [number, number]; axisMonths?: readonly string[] } = {}) {
    // Nested dual-axis layers collapse columns in this renderer; flat EUR layers share the observed domain.
    const vegaLiteSpec: VisualizationSpec = {
        ...trendSpec,
        encoding: axisMonths ? {
            ...trendSpec.encoding,
            x: { ...trendSpec.encoding.x, scale: { domain: [...axisMonths] } },
        } : trendSpec.encoding,
        layer: trendSpec.layer.map((layer, index) => index < 2 && eurDomain ? {
            ...layer,
            encoding: { ...layer.encoding, y: { ...layer.encoding.y, scale: { domain: eurDomain } } },
        } : layer),
    } as VisualizationSpec;
    return {
        connection,
        query: insertInteractionFilters(trendQuery, interactionFilters, "/*__FILTER_ARGUMENTS__*/", "beforeMeasures"),
        columnMetadata: {
            ...chartMetadata,
            "Trend Date[Year Month]": { name: "Month", displayName: "Billing month" },
            "Trend Date[Month Start]": { name: "MonthStart" },
        },
        vegaLiteSpec,
    };
}

export function accounts({ interactionFilters = [] }: QueryParams = {}) {
    const vegaLiteSpec: VisualizationSpec = accountsSpec as VisualizationSpec;
    return {
        connection,
        query: insertInteractionFilters(accountsQuery, interactionFilters, "/*__FILTER_ARGUMENTS__*/", "beforeMeasures"),
        columnMetadata: {
            ...chartMetadata,
            "Customers[Key Account Name]": { name: "KeyAccount", displayName: "Key account" },
        },
        vegaLiteSpec,
    };
}

export function productTypes({ interactionFilters = [] }: QueryParams = {}) {
    const vegaLiteSpec: VisualizationSpec = productTypesSpec as VisualizationSpec;
    return {
        connection,
        query: insertInteractionFilters(productTypesQuery, interactionFilters, "/*__FILTER_ARGUMENTS__*/", "beforeMeasures"),
        columnMetadata: {
            ...chartMetadata,
            "Product Type[Type]": { name: "Type", displayName: "Product type" },
        },
        vegaLiteSpec,
    };
}
