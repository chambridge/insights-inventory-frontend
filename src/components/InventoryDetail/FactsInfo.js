import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Flex, FlexItem, Grid, GridItem, Label } from '@patternfly/react-core';
import {
  Skeleton,
  SkeletonSize,
} from '@redhat-cloud-services/frontend-components/Skeleton';
import { DateFormat } from '@redhat-cloud-services/frontend-components/DateFormat';
import { CullingInformation } from '@redhat-cloud-services/frontend-components/CullingInfo';
import { getFact } from './helpers';
import InsightsDisconnected from '../../Utilities/InsightsDisconnected';
import { verifyCulledReporter } from '../../Utilities/sharedFunctions';
import { REPORTER_PUPTOO } from '../../Utilities/constants';
import OsModeLabel from './OsModeLabel';

/**
 * Basic information about system.
 * UUID and last seen.
 *  @param {*} props entity and if entity is loaded.
 */
const FactsInfo = ({ entity, loaded, LastSeenWrapper, ...props }) => (
  <Grid className="ins-entity-facts" {...props}>
    <GridItem md={6}>
      <Flex>
        <FlexItem>UUID:</FlexItem>
        <FlexItem grow={{ default: 'grow' }}>
          {loaded ? (
            getFact(`id`, entity) || ' '
          ) : (
            <Skeleton size={SkeletonSize.md} fontSize="sm" />
          )}
        </FlexItem>
      </Flex>
      <Flex>
        <FlexItem>Last seen:</FlexItem>
        <FlexItem grow={{ default: 'grow' }}>
          {loaded ? (
            <LastSeenWrapper>
              {CullingInformation ? (
                <CullingInformation
                  culled={getFact('culled_timestamp', entity)}
                  staleWarning={getFact('stale_warning_timestamp', entity)}
                  stale={getFact('stale_timestamp', entity)}
                  currDate={new Date()}
                >
                  <DateFormat date={getFact('updated', entity)} type="exact" />
                </CullingInformation>
              ) : (
                <DateFormat date={getFact('updated', entity)} type="exact" />
              )}
            </LastSeenWrapper>
          ) : (
            <Skeleton size={SkeletonSize.md} fontSize="sm" />
          )}
          {loaded &&
            verifyCulledReporter(
              getFact('per_reporter_staleness', entity),
              REPORTER_PUPTOO,
            ) && <InsightsDisconnected />}
        </FlexItem>
      </Flex>
      <Flex>
        <FlexItem>
          {loaded &&
            entity?.system_profile?.operating_system?.name ===
              'CentOS Linux' && (
              <div>
                <Label color="cyan">CentOS Linux</Label>
              </div>
            )}
        </FlexItem>
        <FlexItem>
          {loaded ? (
            <OsModeLabel
              osMode={
                entity?.system_profile?.bootc_status?.booted?.image_digest ||
                entity?.system_profile?.host_type === 'edge'
                  ? 'image'
                  : 'package'
              }
            />
          ) : null}
        </FlexItem>
      </Flex>
    </GridItem>
  </Grid>
);

FactsInfo.propTypes = {
  loaded: PropTypes.bool,
  entity: PropTypes.object,
  LastSeenWrapper: PropTypes.elementType,
};

FactsInfo.defaultProps = {
  UUIDWrapper: Fragment,
  LastSeenWrapper: Fragment,
};

export default FactsInfo;
