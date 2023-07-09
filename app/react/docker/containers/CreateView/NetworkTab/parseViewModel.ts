import { DockerNetwork } from '@/react/docker/networks/types';

import { ContainerJSON } from '../../queries/container';
import { DockerContainerResponse } from '../../types/response';

import { Values } from './types';

export function parseViewModel(
  config?: ContainerJSON,
  availableNetworks: Array<DockerNetwork> = [],
  runningContainers: Array<DockerContainerResponse> = []
): Values {
  if (
    !config ||
    !config.HostConfig ||
    !config.NetworkSettings ||
    !config.Config
  ) {
    return {
      networkMode: 'bridge',
      hostname: '',
      domain: '',
      macAddress: '',
      ipv4Address: '',
      ipv6Address: '',
      primaryDns: '',
      secondaryDns: '',
      hostsFileEntries: [],
      container: '',
    };
  }

  const dns = config.HostConfig?.Dns;
  const [primaryDns = '', secondaryDns = ''] = dns || [];

  const hostsFileEntries = config.HostConfig?.ExtraHosts || [];

  const [networkMode, container = ''] = getNetworkMode(
    config,
    availableNetworks,
    runningContainers
  );

  const networkSettings = config.NetworkSettings?.Networks?.[networkMode];
  let ipv4Address = '';
  let ipv6Address = '';
  if (networkSettings && networkSettings.IPAMConfig) {
    ipv4Address = networkSettings.IPAMConfig.IPv4Address || '';
    ipv6Address = networkSettings.IPAMConfig.IPv6Address || '';
  }

  const macAddress = networkSettings?.MacAddress || '';

  return {
    networkMode,
    hostname: config.Config.Hostname || '',
    domain: config.Config.Domainname || '',
    macAddress,
    ipv4Address,
    ipv6Address,
    primaryDns,
    secondaryDns,
    hostsFileEntries,
    container,
  };
}

function getNetworkMode(
  config: ContainerJSON,
  availableNetworks: Array<DockerNetwork> = [],
  runningContainers: Array<DockerContainerResponse> = []
) {
  let networkMode = config.HostConfig?.NetworkMode || '';
  if (!networkMode) {
    const networks = Object.keys(config.NetworkSettings?.Networks || {});
    if (networks.length > 0) {
      [networkMode] = networks;
    }
  }

  if (!networkMode) {
    return ['bridge'] as const;
  }

  if (networkMode === 'default') {
    networkMode = 'bridge';
    if (!availableNetworks.find((n) => n.Name === 'bridge')) {
      networkMode = 'nat';
    }

    return [networkMode] as const;
  }

  if (networkMode.indexOf('container:') === 0) {
    const networkContainerId = networkMode.split(/^container:/)[1];
    const container =
      runningContainers.find((c) => c.Id === networkContainerId)?.Names[0] ||
      '';
    return ['container', container] as const;
  }

  return [networkMode] as const;
}
