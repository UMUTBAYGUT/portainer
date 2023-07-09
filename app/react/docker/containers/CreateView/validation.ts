import { object, SchemaOf } from 'yup';

import { envVarValidation } from '@@/form-components/EnvironmentVariablesFieldset';

import { baseFormValidation } from './BaseForm';
import { capabilitiesTabValidation } from './CapabilitiesTab';
import { commandsTabValidation } from './CommandsTab';
import { labelsTabValidation } from './LabelsTab';
import { networkTabValidation } from './NetworkTab';
import { resourcesTabValidation } from './ResourcesTab';
import { restartPolicyTabValidation } from './RestartPolicyTab';
import { volumesTabValidation } from './VolumesTab';
import { Values } from './useInitialValues';

export function validation({
  isAdmin,
  maxCpu,
  maxMemory,
  isDuplicating,
  isDuplicatingPortainer,
}: {
  isAdmin: boolean;
  maxCpu: number;
  maxMemory: number;
  isDuplicating: boolean | undefined;
  isDuplicatingPortainer: boolean | undefined;
}): SchemaOf<Values> {
  return object({
    commands: commandsTabValidation(),
    volumes: volumesTabValidation(),
    network: networkTabValidation(),
    labels: labelsTabValidation(),
    restartPolicy: restartPolicyTabValidation(),
    resources: resourcesTabValidation({ maxCpu, maxMemory }),
    capabilities: capabilitiesTabValidation(),
    env: envVarValidation(),
  }).concat(
    baseFormValidation({ isAdmin, isDuplicating, isDuplicatingPortainer })
  );
}
