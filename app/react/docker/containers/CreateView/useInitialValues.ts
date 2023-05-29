import { useCurrentStateAndParams } from '@uirouter/react';

import {
  BaseFormValues,
  parseBaseFormViewModel,
} from '@/react/docker/containers/CreateView/BaseForm';
import {
  CapabilitiesTabValues,
  getDefaultCapabilitiesTabViewModel,
  parseCapabilitiesTabViewModel,
} from '@/react/docker/containers/CreateView/CapabilitiesTab';
import {
  CommandsTabValues,
  getDefaultCommandsTabViewModel,
  parseCommandsTabViewModel,
} from '@/react/docker/containers/CreateView/CommandsTab';
import {
  LabelsTabValues,
  parseLabelsTabViewModel,
} from '@/react/docker/containers/CreateView/LabelsTab';
import {
  getDefaultNetworkTabViewModel,
  NetworkTabValues,
  parseNetworkTabViewModel,
} from '@/react/docker/containers/CreateView/NetworkTab';
import {
  ResourcesTabValues,
  parseResourcesTabViewModel,
  getDefaultResourcesTabViewModel,
} from '@/react/docker/containers/CreateView/ResourcesTab';
import {
  RestartPolicy,
  parseRestartPolicyTabViewModel,
} from '@/react/docker/containers/CreateView/RestartPolicyTab';
import {
  VolumesTabValues,
  parseVolumesTabViewModel,
} from '@/react/docker/containers/CreateView/VolumesTab';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';
import { useCurrentUser } from '@/react/hooks/useUser';
import { useEnvironmentRegistries } from '@/react/portainer/environments/queries/useEnvironmentRegistries';
import {
  getDefaultImageConfig,
  getImageConfig,
} from '@/react/portainer/registries/utils/getImageConfig';
import { useWebhooks } from '@/react/portainer/webhooks/useWebhooks';
import { UserId } from '@/portainer/users/types';

import { parseArrayOfStrings } from '@@/form-components/EnvironmentVariablesFieldset/utils';
import { EnvVarValues } from '@@/form-components/EnvironmentVariablesFieldset';

import { useContainer } from '../queries/container';
import { useContainers } from '../queries/containers';

import { useNetworksForSelector } from './NetworkTab/NetworkSelector';

export interface Values extends BaseFormValues {
  commands: CommandsTabValues;
  volumes: VolumesTabValues;
  network: NetworkTabValues;
  labels: LabelsTabValues;
  restartPolicy: RestartPolicy;
  resources: ResourcesTabValues;
  capabilities: CapabilitiesTabValues;
  env: EnvVarValues;
}

export function useInitialValues(submitting: boolean) {
  const {
    params: { nodeName, from },
  } = useCurrentStateAndParams();
  const environmentId = useEnvironmentId();
  const { isAdmin, user } = useCurrentUser();
  const networksQuery = useNetworksForSelector();

  const fromContainerQuery = useContainer(environmentId, from, {
    enabled: !submitting,
  });
  const runningContainersQuery = useContainers(environmentId, {
    enabled: !!from,
  });
  const webhookQuery = useWebhooks(
    { endpointId: environmentId, resourceId: from },
    { enabled: !!from }
  );
  const registriesQuery = useEnvironmentRegistries(environmentId, {
    enabled: !!from,
  });

  if (!networksQuery.data) {
    return null;
  }

  const hasBridgeNetwork = networksQuery.data.some((n) => n.Name === 'bridge');

  if (!from) {
    return {
      initialValues: defaultValues(
        isAdmin,
        user.Id,
        hasBridgeNetwork,
        nodeName
      ),
    };
  }

  const fromContainer = fromContainerQuery.data;
  if (
    !fromContainer ||
    !registriesQuery.data ||
    !runningContainersQuery.data ||
    !webhookQuery.data
  ) {
    return null;
  }

  const network = parseNetworkTabViewModel(
    fromContainer,
    networksQuery.data,
    runningContainersQuery.data
  );

  const extraNetworks = Object.entries(
    fromContainer.NetworkSettings?.Networks || {}
  )
    .filter(([n]) => n !== network.networkMode)
    .map(([networkName, network]) => ({
      networkName,
      aliases: (network.Aliases || []).filter(
        (o) => !fromContainer.Id?.startsWith(o)
      ),
    }));

  const imageConfig = fromContainer?.Config?.Image
    ? getImageConfig(fromContainer?.Config?.Image, registriesQuery.data)
    : getDefaultImageConfig();

  const initialValues: Values = {
    commands: parseCommandsTabViewModel(fromContainer),
    volumes: parseVolumesTabViewModel(fromContainer),
    network,
    labels: parseLabelsTabViewModel(fromContainer),
    restartPolicy: parseRestartPolicyTabViewModel(fromContainer),
    resources: parseResourcesTabViewModel(fromContainer),
    capabilities: parseCapabilitiesTabViewModel(fromContainer),
    nodeName,
    image: imageConfig,
    enableWebhook: webhookQuery.data ? webhookQuery.data.length > 0 : false,
    env: parseArrayOfStrings(fromContainer?.Config?.Env),
    ...parseBaseFormViewModel(isAdmin, user.Id, fromContainer),
  };

  return { initialValues, isDuplicating: !!from, extraNetworks };
}

function defaultValues(
  isAdmin: boolean,
  currentUserId: UserId,
  hasBridgeNetwork: boolean,
  nodeName: string
): Values {
  return {
    commands: getDefaultCommandsTabViewModel(),
    volumes: [],
    network: getDefaultNetworkTabViewModel(hasBridgeNetwork),
    labels: [],
    restartPolicy: RestartPolicy.No,
    resources: getDefaultResourcesTabViewModel(),
    capabilities: getDefaultCapabilitiesTabViewModel(),
    nodeName,
    image: getDefaultImageConfig(),
    enableWebhook: false,
    env: [],
    ...parseBaseFormViewModel(isAdmin, currentUserId),
  };
}
