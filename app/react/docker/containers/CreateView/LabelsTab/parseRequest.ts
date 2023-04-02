import { CreateContainerRequest } from '../types';

import { Values } from './types';

export function parseRequest(
  oldConfig: CreateContainerRequest,
  values: Values
): CreateContainerRequest {
  return {
    ...oldConfig,
    Labels: Object.fromEntries(
      values
        .filter((label) => label.name)
        .map((label) => [label.name, label.value])
    ),
  };
}
