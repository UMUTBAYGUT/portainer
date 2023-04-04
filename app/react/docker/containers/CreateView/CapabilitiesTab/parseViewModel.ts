import { ContainerJSON } from '@/react/docker/containers/queries/container';

import { capabilities } from './types';
import { Values } from './CapabilitiesTab';

export function parseViewModel(config?: ContainerJSON): Values {
  const { CapAdd, CapDrop } = getDefaults(config);

  const missingCaps = capabilities
    .filter(
      (cap) =>
        cap.default && !CapAdd.includes(cap.key) && !CapDrop.includes(cap.key)
    )
    .map((cap) => cap.key);

  return [...CapAdd, ...missingCaps];

  function getDefaults(config?: ContainerJSON) {
    if (!config || !config.HostConfig) {
      return {
        CapAdd: [],
        CapDrop: [],
      };
    }

    return {
      CapAdd: config.HostConfig.CapAdd || [],
      CapDrop: config.HostConfig.CapDrop || [],
    };
  }
}
