import { PortMap } from 'docker-types/generated/1.41';
import _ from 'lodash';

import { Values } from './PortsMappingField';

export type Range = {
  start: number;
  end: number;
};

export function parseViewModel(portBindings: PortMap): Values {
  const parsedPorts = parsePorts(portBindings);
  const sortedPorts = sortPorts(parsedPorts);

  return combinePorts(sortedPorts);

  function isProtocol(value: string): value is 'tcp' | 'udp' {
    return value === 'tcp' || value === 'udp';
  }

  function parsePorts(portBindings: PortMap): Array<{
    hostPort: number;
    protocol: 'tcp' | 'udp';
    containerPort: number;
  }> {
    return Object.entries(portBindings).flatMap(([key, bindings]) => {
      const [containerPort, protocol] = key.split('/');

      if (!isProtocol(protocol)) {
        throw new Error(`Invalid protocol: ${protocol}`);
      }

      if (!bindings) {
        return [];
      }

      return bindings.map((binding) => ({
        hostPort: parseInt(binding.HostPort || '0', 10),
        protocol,
        containerPort: parseInt(containerPort, 10),
      }));
    });
  }

  function sortPorts(
    ports: Array<{
      hostPort: number;
      protocol: 'tcp' | 'udp';
      containerPort: number;
    }>
  ): Array<{
    hostPort: number;
    protocol: 'tcp' | 'udp';
    containerPort: number;
  }> {
    return _.sortBy(ports, ['containerPort', 'hostPort', 'protocol']);
  }

  function combinePorts(
    ports: Array<{
      hostPort: number;
      protocol: 'tcp' | 'udp';
      containerPort: number;
    }>
  ) {
    return ports
      .reduce((acc, port) => {
        const lastPort = acc[acc.length - 1];

        if (
          lastPort &&
          lastPort.containerPort.end === port.containerPort - 1 &&
          lastPort.hostPort.end === port.hostPort - 1 &&
          lastPort.protocol === port.protocol
        ) {
          lastPort.containerPort.end = port.containerPort;
          lastPort.hostPort.end = port.hostPort;
          return acc;
        }

        return [
          ...acc,
          {
            hostPort: {
              start: port.hostPort,
              end: port.hostPort,
            },
            containerPort: {
              start: port.containerPort,
              end: port.containerPort,
            },
            protocol: port.protocol,
          },
        ];
      }, [] as Array<{ hostPort: Range; containerPort: Range; protocol: 'tcp' | 'udp' }>)
      .map(({ protocol, containerPort, hostPort }) => ({
        hostPort: getRange(hostPort.start, hostPort.end),
        containerPort: getRange(containerPort.start, containerPort.end),
        protocol,
      }));

    function getRange(start: number, end: number): string {
      if (start === end) {
        if (start === 0) {
          return '';
        }

        return start.toString();
      }

      return `${start}-${end}`;
    }
  }
}
