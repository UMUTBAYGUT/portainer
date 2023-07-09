import { ContainerJSON } from '../../queries/container';

import { parseDevicesViewModel } from './DevicesField';
import { parseViewModel as parseGpuViewModel } from './Gpu';
import { toViewModelMemory } from './memory-utils';
import { Values } from './ResourcesTab';

export function parseViewModel(config: ContainerJSON): Values {
  return {
    runtime: {
      privileged: config.HostConfig?.Privileged || false,
      init: config.HostConfig?.Init || false,
      type: config.HostConfig?.Runtime || '',
    },
    devices: parseDevicesViewModel(config.HostConfig?.Devices || []),
    sysctls: Object.entries(config.HostConfig?.Sysctls || {}).map(
      ([name, value]) => ({
        name,
        value,
      })
    ),
    gpu: parseGpuViewModel(config.HostConfig?.DeviceRequests || []),
    sharedMemorySize: toViewModelMemory(config.HostConfig?.ShmSize),
    resources: {
      cpu: cpu(config.HostConfig?.NanoCpus),
      reservation: toViewModelMemory(config.HostConfig?.MemoryReservation),
      limit: toViewModelMemory(config.HostConfig?.Memory),
    },
  };

  function cpu(value = 0) {
    if (value < 0) {
      return 0;
    }

    return value / 1000000000;
  }
}

export function getDefaultViewModel(): Values {
  return {
    runtime: {
      privileged: false,
      init: false,
      type: '',
    },
    devices: [],
    sysctls: [],
    sharedMemorySize: 64,
    gpu: parseGpuViewModel(),
    resources: {
      reservation: 0,
      limit: 0,
      cpu: 0,
    },
  };
}
