import { CreateContainerRequest } from '../types';

import { parseRequest as parseGPURequest } from './Gpu';
import { toConfigMemory } from './memory-utils';
import { Values } from './ResourcesTab';
import { parseRequest as parseResourcesRequest } from './ResourcesFieldset';

export function parseRequest(
  oldConfig: CreateContainerRequest,
  values: Values
): CreateContainerRequest {
  return {
    ...oldConfig,
    HostConfig: {
      ...parseResourcesRequest(oldConfig.HostConfig, values.resources),
      ...oldConfig.HostConfig,
      Privileged: values.runtime.privileged,
      Init: values.runtime.init,
      Runtime: values.runtime.type,
      Devices: values.devices.map((device) => ({
        PathOnHost: device.pathOnHost,
        PathInContainer: device.pathInContainer,
        CgroupPermissions: 'rwm',
      })),
      Sysctls: Object.fromEntries(
        values.sysctls.map((sysctl) => [sysctl.name, sysctl.value])
      ),
      ShmSize: toConfigMemory(values.sharedMemorySize),
      DeviceRequests: parseGPURequest(
        oldConfig.HostConfig.DeviceRequests || [],
        values.gpu
      ),
    },
  };
}
