import {
  Alert,
  AlertActionLink,
  Button,
  Flex,
  FlexItem,
  Label,
  Modal,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import PropTypes from 'prop-types';
import React, { useCallback, useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearFilters,
  fetchGroupDetail,
  selectEntity,
} from '../../../store/inventory-actions';
import InventoryTable from '../../InventoryTable/InventoryTable';
import { addHostsToGroupById } from '../utils/api';
import apiWithToast from '../utils/apiWithToast';
import { useBulkSelectConfig } from '../../../Utilities/hooks/useBulkSelectConfig';
import difference from 'lodash/difference';
import map from 'lodash/map';
import ImmutableDevicesView from '../../InventoryTabs/ImmutableDevices/EdgeDevicesView';
import useFeatureFlag from '../../../Utilities/useFeatureFlag';
import { PageHeaderTitle } from '@redhat-cloud-services/frontend-components/PageHeader';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { hybridInventoryTabKeys } from '../../../Utilities/constants';
import { AccountStatContext } from '../../../Contexts';
import { prepareColumnsCoventional as prepareColumns } from '../../GroupSystems/helpers';
import { defaultConventionalSystemsGetEntities } from '../helpers/defaultConventionalSystemsGetEntities';

const AddSystemsToGroupModal = ({
  isModalOpen,
  setIsModalOpen,
  groupId,
  groupName,
  activeTab,
}) => {
  const dispatch = useDispatch();

  const selected = useSelector(
    (state) => state?.entities?.selected || new Map(),
  );

  const isKesselEnabled = useFeatureFlag('hbi.kessel-migration');
  const rows = useSelector(({ entities }) => entities?.rows || []);

  const total = useSelector(({ entities }) => entities?.total);
  const displayedIds = map(rows, 'id');
  const pageSelected =
    difference(displayedIds, selected ? [...selected.keys()] : []).length === 0;
  const bulkSelectConfig = useBulkSelectConfig(
    selected,
    null,
    total,
    rows,
    true,
    pageSelected,
  );

  const alreadyHasGroup = [...selected].filter((entry) => {
    return isKesselEnabled
      ? !entry[1]?.groups?.[0]?.ungrouped
      : entry[1]?.groups?.[0]?.name !== undefined &&
          entry[1]?.groups?.[0]?.name !== '';
  });

  const handleSystemAddition = useCallback(
    (hostIds) => {
      const statusMessages = {
        onSuccess: {
          title: 'Success',
          description: `${hostIds.length > 1 ? 'Systems' : 'System'} added to ${
            groupName || groupId
          }`,
          actionLinks: (
            <AlertActionLink onClick={() => window.location.reload()}>
              Refresh
            </AlertActionLink>
          ),
        },
        onError: {
          title: 'Error',
          description: `Failed to add ${
            hostIds.length > 1 ? 'systems' : 'system'
          } to ${groupName || groupId}`,
        },
      };
      return apiWithToast(
        dispatch,
        () => addHostsToGroupById(groupId, hostIds),
        statusMessages,
      );
    },
    [isModalOpen],
  );

  const numOfSelectedSystems = selected ? selected.size : 0;

  const handleModalClose = () => {
    if (numOfSelectedSystems > 0) {
      dispatch(selectEntity(-1, false));
    }
    dispatch(clearFilters());
    setIsModalOpen(false);
  };

  const edgeParityInventoryListEnabled = useFeatureFlag(
    'edgeParity.inventory-list',
  );
  const edgeParityInventoryGroupsEnabled = useFeatureFlag(
    'edgeParity.inventory-groups-enabled',
  );
  const edgeParityFilterDeviceEnabled = useFeatureFlag(
    'edgeParity.inventory-list-filter',
  );
  const edgeParityEnabled =
    edgeParityInventoryListEnabled && edgeParityInventoryGroupsEnabled;

  const defaultInventorySystemsGetEntities = (
    items,
    config,
    showTags,
    defaultGetEntities,
  ) =>
    defaultGetEntities(
      items,
      {
        ...config,
        filters: {
          ...config.filters,
        },
      },
      showTags,
    );
  const [selectedImmutableDevices, setSelectedImmutableDevices] = useState([]);
  const selectedImmutableKeys = selectedImmutableDevices.map(
    (immutableDevice) => immutableDevice.id,
  );

  // overallSelectedKeys is the list of the conventional and immutable systems ids
  const overallSelectedKeys = [...selected.keys(), ...selectedImmutableKeys];
  // noneSelected a boolean showing that no system is selected
  const noneSelected = overallSelectedKeys.length === 0;

  const immutableDevicesAlreadyHasGroup = selectedImmutableDevices.filter(
    (immutableDevice) =>
      isKesselEnabled
        ? !immutableDevice.deviceGroups?.[0]?.ungrouped
        : immutableDevice.deviceGroups?.length > 0,
  );
  // showWarning when conventional or immutable systems had groups
  const showWarning =
    alreadyHasGroup.length > 0 || immutableDevicesAlreadyHasGroup.length > 0;

  const { hasEdgeDevices } = useContext(AccountStatContext);
  const [activeTabKey, setActiveTabKey] = useState(
    hybridInventoryTabKeys[activeTab] === undefined
      ? hybridInventoryTabKeys.conventional.key
      : activeTab,
  );

  const handleTabClick = (_event, tabKey) => {
    setActiveTabKey(tabKey);
  };

  let overallSelectedText;
  if (overallSelectedKeys.length === 1) {
    overallSelectedText = '1 system selected';
  } else if (overallSelectedKeys.length > 1) {
    overallSelectedText = `${overallSelectedKeys.length} systems selected`;
  }

  const ConventionalInventoryTable = (
    <InventoryTable
      columns={(columns) => prepareColumns(columns, false, true)}
      getEntities={
        edgeParityFilterDeviceEnabled
          ? defaultConventionalSystemsGetEntities
          : defaultInventorySystemsGetEntities
      }
      variant={TableVariant.compact} // TODO: this doesn't affect the table variant
      tableProps={{
        isStickyHeader: false,
        canSelectAll: false,
      }}
      bulkSelect={bulkSelectConfig}
      initialLoading={true}
      showTags
      showCentosVersions
    />
  );

  const handleAddSystemsButton = async () => {
    await handleSystemAddition(overallSelectedKeys);
    dispatch(fetchGroupDetail(groupId));
    handleModalClose();
  };

  return (
    isModalOpen && (
      <>
        {/** hosts selection modal */}
        <Modal
          header={
            <Flex direction={{ default: 'row' }} style={{ width: '100%' }}>
              <FlexItem align={{ default: 'alignLeft' }}>
                <PageHeaderTitle title={'Add systems'} />
              </FlexItem>
              {edgeParityEnabled && !noneSelected && (
                <FlexItem align={{ default: 'alignRight' }}>
                  <Label
                    variant="outline"
                    color="blue"
                    icon={<InfoCircleIcon />}
                  >
                    {overallSelectedText}
                  </Label>
                </FlexItem>
              )}
            </Flex>
          }
          isOpen={isModalOpen}
          onClose={handleModalClose}
          footer={
            <Flex direction={{ default: 'column' }} style={{ width: '100%' }}>
              {showWarning && (
                <FlexItem fullWidth={{ default: 'fullWidth' }}>
                  <Alert
                    variant="warning"
                    isInline
                    title="One or more of the selected systems already belong to a workspace. Only systems not already belonging to a workspace can be added. Unselect these systems to move forward."
                  />
                </FlexItem>
              )}
              <FlexItem>
                <Button
                  key="confirm"
                  variant="primary"
                  onClick={handleAddSystemsButton}
                  isDisabled={noneSelected || showWarning}
                >
                  Add systems
                </Button>
                <Button key="cancel" variant="link" onClick={handleModalClose}>
                  Cancel
                </Button>
              </FlexItem>
            </Flex>
          }
          variant="large" // required to accomodate the systems table
        >
          {edgeParityEnabled && hasEdgeDevices ? (
            <Tabs
              className="pf-m-light pf-v5-c-table"
              activeKey={activeTabKey}
              onSelect={handleTabClick}
              aria-label="Hybrid inventory tabs"
            >
              <Tab
                eventKey={hybridInventoryTabKeys.conventional.key}
                title={<TabTitleText>Conventional (RPM-DNF)</TabTitleText>}
              >
                {ConventionalInventoryTable}
              </Tab>
              <Tab
                eventKey={hybridInventoryTabKeys.immutable.key}
                title={<TabTitleText>Immutable (OSTree)</TabTitleText>}
              >
                <section className={'pf-v5-c-toolbar'}>
                  <ImmutableDevicesView
                    skeletonRowQuantity={15}
                    hasCheckbox={true}
                    isSystemsView={false}
                    selectedItems={setSelectedImmutableDevices}
                  />
                </section>
              </Tab>
            </Tabs>
          ) : (
            ConventionalInventoryTable
          )}
        </Modal>
      </>
    )
  );
};

AddSystemsToGroupModal.propTypes = {
  isModalOpen: PropTypes.bool,
  setIsModalOpen: PropTypes.func,
  reloadData: PropTypes.func,
  groupId: PropTypes.string,
  groupName: PropTypes.string,
  activeTab: PropTypes.string,
};

export default AddSystemsToGroupModal;
