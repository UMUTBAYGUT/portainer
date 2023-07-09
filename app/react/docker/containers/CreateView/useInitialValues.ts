import { BaseFormValues } from '@/react/docker/containers/CreateView/BaseForm';
import { CapabilitiesTabValues } from '@/react/docker/containers/CreateView/CapabilitiesTab';
import { CommandsTabValues } from '@/react/docker/containers/CreateView/CommandsTab';
import { LabelsTabValues } from '@/react/docker/containers/CreateView/LabelsTab';
import { NetworkTabValues } from '@/react/docker/containers/CreateView/NetworkTab';
import { ResourcesTabValues } from '@/react/docker/containers/CreateView/ResourcesTab';
import { RestartPolicy } from '@/react/docker/containers/CreateView/RestartPolicyTab';
import { VolumesTabValues } from '@/react/docker/containers/CreateView/VolumesTab';

import { EnvVarValues } from '@@/form-components/EnvironmentVariablesFieldset';

export interface Values extends BaseFormValues {
  commands: CommandsTabValues;
  volumes: VolumesTabValues;
  network: NetworkTabValues;
  labels: LabelsTabValues;
  restartPolicy: RestartPolicy;
  resources: ResourcesTabValues;
  capabilities: CapabilitiesTabValues;
  env: EnvVarValues;
}
