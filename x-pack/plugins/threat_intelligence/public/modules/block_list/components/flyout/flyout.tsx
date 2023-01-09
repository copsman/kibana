/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import {
  EntriesArray,
  ExceptionListItemSchema,
  ListOperator,
} from '@kbn/securitysolution-io-ts-list-types';
import { NonEmptyOrNullableStringArray } from '@kbn/securitysolution-io-ts-types';
import { useSecurityContext } from '../../../../hooks/use_security_context';

export interface BlockListFlyoutProps {
  /**
   * Indicator file-hash value (sha256, sh1 or md5) to pass to the block list flyout.
   */
  indicatorFileHash: string;
}

/**
 * Component calling the block list flyout (retrieved from the SecuritySolution plugin via context).
 */
export const BlockListFlyout: VFC<BlockListFlyoutProps> = ({ indicatorFileHash }) => {
  const { blockList } = useSecurityContext();
  const Component = blockList.getFlyoutComponent();
  const exceptionListApiClient = blockList.exceptionListApiClient;
  const FormComponent = blockList.getFormComponent();

  const field: string = 'file.hash.*';
  const operator: ListOperator = 'included';
  const entryType = 'match_any';
  const value: NonEmptyOrNullableStringArray = [indicatorFileHash];
  const entries: EntriesArray = [
    {
      field,
      operator,
      type: entryType,
      value,
    },
  ];

  const item: ExceptionListItemSchema = {
    comments: [],
    description: '',
    entries,
    item_id: undefined,
    list_id: 'endpoint_blocklists',
    meta: { temporaryUuid: '' },
    name: '',
    namespace_type: 'agnostic',
    os_types: ['windows'],
    tags: ['policy:all'],
    type: 'simple',
  };

  const props = {
    apiClient: exceptionListApiClient,
    item,
    policies: [],
    policiesIsLoading: false,
    FormComponent,
    labels: {},
    'data-test-subj': 'threat_intelligence',
    size: 'm',
  };

  return <Component {...props} />;
};
