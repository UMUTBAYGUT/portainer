import { parseAccessControlFormData } from '@/react/portainer/access-control/utils';
import { ResourceControlOwnership } from '@/react/portainer/access-control/types';
import { UserId } from '@/portainer/users/types';

import { ImageConfigValues } from '@@/ImageConfigFieldset';

import { ContainerResponse } from '../../queries/container';

import { parseViewModel as parsePortsViewModel } from './PortsMappingField.viewModel';
import { Values } from './BaseForm';

export function parseViewModel(
  isAdmin: boolean,
  currentUserId: UserId,
  config?: ContainerResponse,
  image?: ImageConfigValues,
  hasWebhook = false,
  nodeName = ''
): Values {
  // accessControl shouldn't be copied to new container

  const accessControl = parseAccessControlFormData(isAdmin, currentUserId);

  if (!config) {
    return {
      accessControl,
      name: '',
      alwaysPull: true,
      autoRemove: false,
      enableWebhook: false,
      nodeName: '',
      ports: [],
      publishAllPorts: false,
      image: image || {
        useRegistry: true,
        image: '',
        registryId: 0,
      },
    };
  }

  if (config?.Portainer?.ResourceControl?.Public) {
    accessControl.ownership = ResourceControlOwnership.PUBLIC;
  }

  return {
    accessControl,
    name: config.Name ? config.Name.replace('/', '') : '',
    alwaysPull: true,
    autoRemove: config.HostConfig?.AutoRemove || false,
    enableWebhook: hasWebhook,
    nodeName,
    ports: parsePortsViewModel(config.HostConfig?.PortBindings || {}),
    publishAllPorts: config.HostConfig?.PublishAllPorts || false,
    image: image || {
      useRegistry: true,
      image: '',
      registryId: 0,
    },
  };
}
