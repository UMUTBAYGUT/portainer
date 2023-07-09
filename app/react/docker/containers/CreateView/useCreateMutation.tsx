import { EndpointSettings } from 'docker-types/generated/1.41';
import { useMutation, useQueryClient } from 'react-query';
import { AxiosRequestHeaders } from 'axios';

import axios, { parseAxiosError } from '@/portainer/services/axios';
import {
  Environment,
  EnvironmentId,
  EnvironmentType,
} from '@/react/portainer/environments/types';
import {
  Registry,
  RegistryId,
} from '@/react/portainer/registries/types/registry';
import { createWebhook } from '@/react/portainer/webhooks/createWebhook';
import { WebhookType } from '@/react/portainer/webhooks/types';
import { AccessControlFormData } from '@/react/portainer/access-control/types';
import { applyResourceControl } from '@/react/portainer/access-control/access-control.service';
import PortainerError from '@/portainer/error';
import {
  mutationOptions,
  withError,
  withInvalidate,
} from '@/react-tools/react-query';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';

import { pullImage } from '../../images/queries/usePullImageMutation';
import {
  removeContainer,
  renameContainer,
  startContainer,
  stopContainer,
  urlBuilder,
} from '../containers.service';
import { PortainerResponse } from '../../types';
import { connectContainer } from '../../networks/queries/useConnectContainer';
import { DockerContainer } from '../types';
import { queryKeys } from '../queries/query-keys';

import { CreateContainerRequest } from './types';
import { Values } from './useInitialValues';

export function useCreateOrReplaceMutation() {
  const environmentId = useEnvironmentId();
  const queryClient = useQueryClient();

  return useMutation(
    createOrReplace,
    mutationOptions(
      withError('Failed to create container'),
      withInvalidate(queryClient, [queryKeys.list(environmentId)])
    )
  );
}

interface CreateOptions {
  config: CreateContainerRequest;
  values: Values;
  registry?: Registry;
  environment: Environment;
}

interface ReplaceOptions extends CreateOptions {
  oldContainer: DockerContainer;
  extraNetworks: Record<string, EndpointSettings>;
}

export function createOrReplace(options: ReplaceOptions | CreateOptions) {
  return 'oldContainer' in options ? replace(options) : create(options);
}

async function create({
  config,
  values,
  registry,
  environment,
}: CreateOptions) {
  await pullImageIfNeeded(
    environment.Id,
    values.nodeName,
    values.alwaysPull,
    values.image.image,
    registry
  );

  await createWithAccessControl(
    config,
    environment,
    values.nodeName,
    values.enableWebhook,
    values.accessControl,
    registry
  );
}

async function replace({
  oldContainer,
  config,
  values,
  registry,
  environment,
  extraNetworks,
}: ReplaceOptions) {
  let containerId = '';
  try {
    await pullImageIfNeeded(
      environment.Id,
      values.nodeName,
      values.alwaysPull,
      values.image.image,
      registry
    );

    await stopAndRenameContainer(environment.Id, values.nodeName, oldContainer);

    containerId = await createWithAccessControl(
      config,
      environment,
      values.nodeName,
      values.enableWebhook,
      values.accessControl,
      registry
    );

    await connectToExtraNetworks(
      environment.Id,
      values.nodeName,
      containerId,
      extraNetworks
    );

    await removeContainer(environment.Id, oldContainer.Id, {
      nodeName: values.nodeName,
    });
  } catch (e) {
    await removeContainer(environment.Id, containerId, {
      nodeName: values.nodeName,
    });
    await renameContainer(
      environment.Id,
      oldContainer.Id,
      values.name,
      values.nodeName
    );

    throw e;
  }
}

async function createWithAccessControl(
  config: CreateContainerRequest,
  environment: Environment,
  nodeName: string,
  enableWebhook: boolean,
  accessControl: AccessControlFormData,
  registry?: Registry
) {
  const containerResponse = await createNewContainer(
    environment.Id,
    nodeName,
    config
  );
  await createContainerWebhook(
    enableWebhook,
    containerResponse.Id,
    environment,
    nodeName,
    registry?.Id
  );

  const resourceControl = containerResponse.Portainer?.ResourceControl;
  if (!resourceControl) {
    throw new PortainerError('resource control expected after creation');
  }

  await applyResourceControl(accessControl, resourceControl.Id);

  return containerResponse.Id;
}

async function pullImageIfNeeded(
  environmentId: EnvironmentId,
  nodeName: string,
  pull: boolean,
  image: string,
  registry?: Registry
) {
  if (pull) {
    return null;
  }

  return pullImage({
    environmentId,
    nodeName,
    image,
    registry,
    ignoreErrors: true,
  });
}

async function createNewContainer(
  environmentId: EnvironmentId,
  nodeName: string,
  config: CreateContainerRequest
) {
  const container = await createContainer(environmentId, nodeName, config);

  await startContainer(environmentId, nodeName, container.Id);

  return container;
}

async function createContainer(
  environmentId: EnvironmentId,
  nodeName: string,
  config: CreateContainerRequest
) {
  try {
    const headers: AxiosRequestHeaders = {};

    if (nodeName) {
      headers['X-PortainerAgent-Target'] = nodeName;
    }

    const { data } = await axios.post<
      PortainerResponse<{ Id: string; Warnings: Array<string> }>
    >(urlBuilder(environmentId, undefined, 'create'), config, { headers });

    return data;
  } catch (err) {
    throw parseAxiosError(err, 'Unable to create container');
  }
}

async function createContainerWebhook(
  enableWebhook: boolean,
  containerId: string,
  environment: Environment,
  nodeName: string,
  registryId?: RegistryId
) {
  const isNotEdgeAgentOnDockerEnvironment =
    environment.Type !== EnvironmentType.EdgeAgentOnDocker;
  if (isNotEdgeAgentOnDockerEnvironment && enableWebhook) {
    await createWebhook({
      resourceId: containerId,
      environmentId: environment.Id,
      registryId,
      webhookType: WebhookType.DockerContainer,
    });
  }
  return containerId;
}

function connectToExtraNetworks(
  environmentId: EnvironmentId,
  nodeName: string,
  containerId: string,
  extraNetworks: Record<string, EndpointSettings>
) {
  if (!extraNetworks) {
    return null;
  }

  return Promise.all(
    Object.entries(extraNetworks).map(([networkId, network]) =>
      connectContainer({
        networkId,
        nodeName,
        containerId,
        environmentId,
        aliases: network.Aliases,
      })
    )
  );
}

async function stopAndRenameContainer(
  environmentId: EnvironmentId,
  nodeName: string,
  container: DockerContainer
) {
  if (!container || !container.Id) {
    return null;
  }
  await stopContainerIfNeeded(environmentId, nodeName, container);

  return renameContainer(
    environmentId,
    container.Id,
    `${container.Names[0]}-old`,
    nodeName
  );
}

function stopContainerIfNeeded(
  environmentId: EnvironmentId,
  nodeName: string,
  container: DockerContainer
) {
  if (container.State !== 'running' || !container.Id) {
    return null;
  }
  return stopContainer(environmentId, nodeName, container.Id);
}
