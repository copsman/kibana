/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { uiToReactComponent } from '../../../../../src/plugins/kibana_react/public';
import type { UiActionsPresentable as Presentable } from '../../../../../src/plugins/ui_actions/public';
import type { ActionFactoryDefinition } from './action_factory_definition';
import type { Configurable } from '../../../../../src/plugins/kibana_utils/public';
import type {
  BaseActionConfig,
  BaseActionFactoryContext,
  SerializedAction,
  SerializedEvent,
} from './types';
import type { ILicense, LicensingPluginStart, LicenseType } from '../../../licensing/public';
import type { UiActionsActionDefinition as ActionDefinition } from '../../../../../src/plugins/ui_actions/public';
import type { SavedObjectReference } from '../../../../../src/core/types';
import type {
  MigrateFunctionsObject,
  PersistableState,
  UiComponent,
} from '../../../../../src/plugins/kibana_utils/common';

export interface ActionFactoryDeps {
  readonly getLicense?: () => ILicense;
  readonly getFeatureUsageStart?: () => LicensingPluginStart['featureUsage'];
}

export class ActionFactory<
  Config extends BaseActionConfig = BaseActionConfig,
  ExecutionContext extends object = object,
  FactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> implements
    Omit<Presentable<FactoryContext>, 'getHref'>,
    Configurable<Config, FactoryContext>,
    PersistableState<SerializedEvent> {
  public readonly id: string;
  public readonly isBeta: boolean;
  public readonly minimalLicense?: LicenseType;
  public readonly licenseFeatureName?: string;
  public readonly order: number;
  public readonly MenuItem?: UiComponent;
  public readonly ReactMenuItem?: FC;
  public readonly CollectConfig: UiComponent;
  public readonly ReactCollectConfig: FC;
  public readonly createConfig: (context: FactoryContext) => Config;
  public readonly isConfigValid: (config: Config, context: FactoryContext) => boolean;
  public readonly migrations: MigrateFunctionsObject;

  constructor(
    protected readonly def: ActionFactoryDefinition<Config, ExecutionContext, FactoryContext>,
    protected readonly deps: ActionFactoryDeps
  ) {
    this.id = def.id;
    this.isBeta = def.isBeta ?? false;
    this.minimalLicense = def.minimalLicense;
    this.licenseFeatureName = def.licenseFeatureName;
    this.order = def.order || 0;
    this.MenuItem = def.MenuItem;
    this.ReactMenuItem = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;
    this.CollectConfig = def.CollectConfig;
    this.ReactCollectConfig = uiToReactComponent(this.CollectConfig);
    this.createConfig = def.createConfig;
    this.isConfigValid = def.isConfigValid;
    this.migrations = def.migrations || {};

    if (def.minimalLicense && !def.licenseFeatureName) {
      throw new Error(
        `ActionFactory [actionFactory.id = ${def.id}] "licenseFeatureName" is required, if "minimalLicense" is provided`
      );
    }
  }

  public getIconType(context: FactoryContext): string | undefined {
    if (!this.def.getIconType) return undefined;
    return this.def.getIconType(context);
  }

  public getDisplayName(context: FactoryContext): string {
    if (!this.def.getDisplayName) return '';
    return this.def.getDisplayName(context);
  }

  public getDisplayNameTooltip(context: FactoryContext): string {
    return '';
  }

  public async isCompatible(context: FactoryContext): Promise<boolean> {
    if (!this.def.isCompatible) return true;
    return await this.def.isCompatible(context);
  }

  /**
   * Does this action factory license requirements
   * compatible with current license?
   */
  public isCompatibleLicense() {
    if (!this.minimalLicense || !this.deps.getLicense) return true;
    const license = this.deps.getLicense();
    return license.isAvailable && license.isActive && license.hasAtLeast(this.minimalLicense);
  }

  public create(
    serializedAction: Omit<SerializedAction<Config>, 'factoryId'>
  ): ActionDefinition<ExecutionContext> {
    const action = this.def.create(serializedAction);
    return {
      ...action,
      isCompatible: async (context: ExecutionContext): Promise<boolean> => {
        if (!this.isCompatibleLicense()) return false;
        if (!action.isCompatible) return true;
        return action.isCompatible(context);
      },
      execute: async (context: ExecutionContext): Promise<void> => {
        this.notifyFeatureUsage();
        return action.execute(context);
      },
    };
  }

  public supportedTriggers(): string[] {
    return this.def.supportedTriggers();
  }

  private notifyFeatureUsage(): void {
    if (!this.minimalLicense || !this.licenseFeatureName || !this.deps.getFeatureUsageStart) return;
    this.deps
      .getFeatureUsageStart()
      .notifyUsage(this.licenseFeatureName)
      .catch(() => {
        // eslint-disable-next-line no-console
        console.warn(
          `ActionFactory [actionFactory.id = ${this.def.id}] fail notify feature usage.`
        );
      });
  }

  public telemetry(state: SerializedEvent, telemetryData: Record<string, any>) {
    return this.def.telemetry ? this.def.telemetry(state, telemetryData) : telemetryData;
  }

  public extract(state: SerializedEvent) {
    return this.def.extract ? this.def.extract(state) : { state, references: [] };
  }

  public inject(state: SerializedEvent, references: SavedObjectReference[]) {
    return this.def.inject ? this.def.inject(state, references) : state;
  }
}
