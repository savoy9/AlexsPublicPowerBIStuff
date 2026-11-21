// @generated — do not edit.

// Connector: salesmodel (fabric-semanticmodel)

import type { ConnectorConfig } from '@microsoft/rayfin-connectors';
import type { FabricSemanticModel } from '@microsoft/rayfin-connector-fabric-semanticmodel';

/**
 * Typed connector schema for "salesmodel" (fabric-semanticmodel).
 * Plug into your AppConnectorsSchema in your RayfinClient setup.
 */
export type SalesmodelSchema = FabricSemanticModel<'executeQuery'>;

export const connectorConfig = {
  connector: 'fabric-semanticmodel',
} as const satisfies ConnectorConfig;
