import { insertInteractionFilters } from "@/lib/query-factory";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { connection, invoiceKpis, moneyFormat } from "../overview";
import type { QueryParams } from "../overview";
import invoiceLinesQuery from "./invoice-lines.dax?raw";

const columnMetadata: ColumnMetadataMap = {
    "[BillingDocument]": { name: "BillingDocument", displayName: "Billing document", format: "0" },
    "[Line]": { name: "Line", displayName: "Line", format: "0" },
    "[BillingDate]": { name: "BillingDate", displayName: "Billing date", format: "yyyy-MM-dd" },
    "[ShipDate]": { name: "ShipDate", displayName: "Ship date", format: "yyyy-MM-dd" },
    "[DocumentType]": { name: "DocumentType", displayName: "Document type" },
    "[CustomerKey]": { name: "CustomerKey", displayName: "Customer key" },
    "[AccountName]": { name: "AccountName", displayName: "Account" },
    "[KeyAccount]": { name: "KeyAccount", displayName: "Key account" },
    "[System]": { name: "System", displayName: "System" },
    "[ProductKey]": { name: "ProductKey", displayName: "Product key", format: "0" },
    "[ProductName]": { name: "ProductName", displayName: "Product" },
    "[Type]": { name: "Type", displayName: "Product type" },
    "[Quantity]": { name: "Quantity", displayName: "Net quantity", format: "#,0" },
    "[Currency]": { name: "Currency", displayName: "Local currency" },
    "[NetValueLocal]": { name: "NetValueLocal", displayName: "Net local value", format: "#,0.00;(#,0.00)" },
    "[FXRate]": { name: "FXRate", displayName: "Local units per EUR", format: "0.0000" },
    "[Sales]": { name: "Sales", displayName: "Net EUR", format: moneyFormat },
    "[OnTime]": { name: "OnTime", displayName: "On-time indicator" },
    "[RowId]": { name: "RowId", displayName: "Technical row identity", format: "0" },
};

export function detailRows({ interactionFilters = [] }: QueryParams = {}) {
    return {
        connection,
        query: insertInteractionFilters(invoiceLinesQuery, interactionFilters, "/*__FILTER_ARGUMENTS__*/", "afterTable"),
        columnMetadata,
    };
}

export const detailTotals = invoiceKpis;
