import { mixed, SchemaOf } from 'yup';

import { RestartPolicy } from './types';

export function validation(): SchemaOf<RestartPolicy> {
  return mixed<RestartPolicy>()
    .oneOf(['no', 'always', 'on-failure', 'unless-stopped'])
    .default('no') as SchemaOf<RestartPolicy>;
}
