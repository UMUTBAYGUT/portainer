import { useNetworks } from '@/react/docker/networks/queries/useNetworks';
import { DockerNetwork } from '@/react/docker/networks/types';
import { useInfo } from '@/react/docker/proxy/queries/useInfo';
import { useApiVersion } from '@/react/docker/proxy/queries/useVersion';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';

import { PortainerSelect } from '@@/form-components/PortainerSelect';

export function NetworksSelector({
  onChange,
  value,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const networksQuery = useNetworksForSelector({
    select(networks) {
      return [...networks, { Name: 'container' }]
        .sort((a, b) => a.Name.localeCompare(b.Name))
        .map((n) => ({ label: n.Name, value: n.Name }));
    },
  });

  return (
    <PortainerSelect
      value={value}
      onChange={onChange}
      options={networksQuery.data || []}
      isLoading={networksQuery.isLoading}
    />
  );
}

export function useNetworksForSelector<T = DockerNetwork[]>({
  select,
}: {
  select?(networks: Array<DockerNetwork>): T;
} = {}) {
  const environmentId = useEnvironmentId();

  const isSwarmQuery = useInfo(environmentId, (info) => !!info.Swarm?.NodeID);
  const dockerApiVersion = useApiVersion(environmentId);

  return useNetworks(
    environmentId,
    {
      local: true,
      swarmAttachable: isSwarmQuery.data && dockerApiVersion >= 1.25,
    },
    {
      enabled: isSwarmQuery.isSuccess,
      select,
    }
  );
}
