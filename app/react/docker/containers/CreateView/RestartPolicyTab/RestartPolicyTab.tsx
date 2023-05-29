import { ButtonSelector } from '@@/form-components/ButtonSelector/ButtonSelector';
import { FormControl } from '@@/form-components/FormControl';

import { CreateContainerRequest } from '../types';

import { RestartPolicy } from './types';

export function RestartPolicyTab({
  values,
  onChange,
}: {
  values: RestartPolicy;
  onChange: (values: RestartPolicy) => void;
}) {
  return (
    <FormControl label="Restart Policy">
      <ButtonSelector
        options={[
          { label: 'Never', value: 'no' },
          { label: 'Always', value: 'always' },
          { label: 'On failure', value: 'on-failure' },
          { label: 'Unless stopped', value: 'unless-stopped' },
        ]}
        value={values}
        onChange={onChange}
      />
    </FormControl>
  );
}

export function parseRestartPolicyTabRequest(
  config: CreateContainerRequest,
  value: RestartPolicy
): CreateContainerRequest {
  return {
    ...config,
    HostConfig: {
      ...config.HostConfig,
      RestartPolicy: {
        ...config.HostConfig.RestartPolicy,
        Name: value,
      },
    },
  };
}
