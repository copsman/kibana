/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionMenu,
  ActionMenuDivider,
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle,
  SectionTitle,
} from '@kbn/observability-shared-plugin/public';
import { ObservabilityTriggerId } from '@kbn/observability-shared-plugin/common';
import { getContextMenuItemsFromActions } from '@kbn/observability-shared-plugin/public';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { CustomLinkMenuSection } from './custom_link_menu_section';
import { getSections } from './sections';

interface Props {
  readonly transaction?: Transaction;
  isLoading: boolean;
}

function ActionMenuButton({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <EuiButton
      data-test-subj="apmActionMenuButtonInvestigateButton"
      isLoading={isLoading}
      iconType="arrowDown"
      iconSide="right"
      onClick={onClick}
    >
      {i18n.translate('xpack.apm.transactionActionMenu.actionsButtonLabel', {
        defaultMessage: 'Investigate',
      })}
    </EuiButton>
  );
}

export function TransactionActionMenu({ transaction, isLoading }: Props) {
  const license = useLicenseContext();
  const hasGoldLicense = license?.isActive && license?.hasAtLeast('gold');

  const [isActionPopoverOpen, setIsActionPopoverOpen] = useState(false);

  return (
    <>
      <ActionMenu
        id="transactionActionMenu"
        closePopover={() => setIsActionPopoverOpen(false)}
        isOpen={isActionPopoverOpen}
        anchorPosition="downRight"
        button={
          <ActionMenuButton
            isLoading={isLoading}
            onClick={() =>
              setIsActionPopoverOpen(
                (prevIsActionPopoverOpen) => !prevIsActionPopoverOpen
              )
            }
          />
        }
      >
        <ActionMenuSections transaction={transaction} />
        {hasGoldLicense && <CustomLinkMenuSection transaction={transaction} />}
      </ActionMenu>
    </>
  );
}

function ActionMenuSections({ transaction }: { transaction?: Transaction }) {
  const { core, uiActions } = useApmPluginContext();
  const location = useLocation();
  const apmRouter = useApmRouter();

  const sections = getSections({
    transaction,
    basePath: core.http.basePath,
    location,
    apmRouter,
  });

  const externalMenuItems = useAsync(() => {
    return transaction
      ? getContextMenuItemsFromActions({
          uiActions,
          triggerId: ObservabilityTriggerId.ApmTransactionContextMenu,
          context: transaction,
        })
      : Promise.resolve([]);
  }, [transaction, uiActions]);

  if (externalMenuItems.value?.length) {
    sections.push([
      {
        key: 'external',
        actions: externalMenuItems.value.map((item, i) => {
          return {
            condition: true,
            key: `external-${i}`,
            label: item.children,
            onClick: item.onClick,
            href: item.href,
          };
        }),
      },
    ]);
  }

  return (
    <div>
      {sections.map((section, idx) => {
        const isLastSection = idx !== sections.length - 1;
        return (
          <div key={idx}>
            {section.map((item) => (
              <Section key={item.key}>
                {item.title && <SectionTitle>{item.title}</SectionTitle>}
                {item.subtitle && (
                  <SectionSubtitle>{item.subtitle}</SectionSubtitle>
                )}
                <SectionLinks>
                  {item.actions.map((action) => (
                    <SectionLink
                      key={action.key}
                      label={action.label}
                      href={action.href}
                      onClick={action.onClick}
                    />
                  ))}
                </SectionLinks>
              </Section>
            ))}
            {isLastSection && <ActionMenuDivider />}
          </div>
        );
      })}
    </div>
  );
}
