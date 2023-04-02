import { ButtonSelector } from '@@/form-components/ButtonSelector/ButtonSelector';
import { FormControl } from '@@/form-components/FormControl';

import { RestartPolicy } from './types';

export function RestartPolicyTab({
  values,
  onChange,
}: {
  values: RestartPolicy;
  onChange: (values: RestartPolicy) => void;
}) {
  return (
    <FormControl label="Restart Policy" size="xsmall">
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
