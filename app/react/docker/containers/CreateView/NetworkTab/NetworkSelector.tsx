import { useNetworks } from '@/react/docker/networks/queries/useNetworks';
import { useInfo } from '@/react/docker/proxy/queries/useInfo';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';

import { Option, PortainerSelect } from '@@/form-components/PortainerSelect';

export function NetworksSelector({
  onChange,
  value,
  apiVersion,
}: {
  value: string;
  onChange: (value: string) => void;
  apiVersion: number;
}) {
  const environmentId = useEnvironmentId();

  const isSwarmQuery = useInfo(environmentId, (info) => !!info.Swarm?.NodeID);

  const networksQuery = useNetworks<Array<Option<string>>>(
    environmentId,
    {
      local: true,
      swarmAttachable: isSwarmQuery.data && apiVersion >= 1.25,
    },
    {
      enabled: isSwarmQuery.isSuccess,
      onSuccess: (networks) => {
        if (
          !value &&
          networks.length > 0 &&
          networks.find((n) => n.value === 'nat')
        ) {
          onChange('nat');
        }
      },
      select(networks) {
        return [...networks, { Name: 'container' }]
          .sort((a, b) => a.Name.localeCompare(b.Name))
          .map((n) => ({ label: n.Name, value: n.Name }));
      },
    }
  );

  return (
    <PortainerSelect
      value={value}
      onChange={onChange}
      options={networksQuery.data || []}
      isLoading={networksQuery.isLoading}
    />
  );
}
