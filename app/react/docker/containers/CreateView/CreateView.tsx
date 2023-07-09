import { Formik } from 'formik';
import { useRouter } from '@uirouter/react';
import { useState } from 'react';

import { parseBaseFormRequest } from '@/react/docker/containers/CreateView/BaseForm';
import { parseCapabilitiesTabRequest } from '@/react/docker/containers/CreateView/CapabilitiesTab';
import { parseCommandsTabRequest } from '@/react/docker/containers/CreateView/CommandsTab';
import { parseLabelsTabRequest } from '@/react/docker/containers/CreateView/LabelsTab';
import { parseNetworkTabRequest } from '@/react/docker/containers/CreateView/NetworkTab';
import { parseResourcesTabRequest } from '@/react/docker/containers/CreateView/ResourcesTab';
import { parseVolumesTabRequest } from '@/react/docker/containers/CreateView/VolumesTab';
import { useCurrentUser } from '@/react/hooks/useUser';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';
import { useCurrentEnvironment } from '@/react/hooks/useCurrentEnvironment';
import { useEnvironmentRegistries } from '@/react/portainer/environments/queries/useEnvironmentRegistries';
import { Registry } from '@/react/portainer/registries/types/registry';
import { notifySuccess } from '@/portainer/services/notifications';
import { useAnalytics } from '@/react/hooks/useAnalytics';
import { useDebouncedValue } from '@/react/hooks/useDebouncedValue';

import { PageHeader } from '@@/PageHeader';
import { convertToArrayOfStrings } from '@@/form-components/EnvironmentVariablesFieldset/utils';
import { ImageConfigValues } from '@@/ImageConfigFieldset';
import { confirmDestructive } from '@@/modals/confirm';
import { buildConfirmButton } from '@@/modals/utils';

import { buildImageFullURI } from '../../images/utils';
import { useContainers } from '../queries/containers';
import { useSystemLimits } from '../../proxy/queries/useInfo';

import { CreateContainerRequest } from './types';
import { parseRestartPolicyTabRequest } from './RestartPolicyTab/RestartPolicyTab';
import { useCreateOrReplaceMutation } from './useCreateMutation';
import { validation } from './validation';
import { useInitialValues, Values } from './useInitialValues';
import { InnerForm } from './InnerForm';

export function CreateView() {
  return (
    <>
      <PageHeader
        title="Create container"
        breadcrumbs={[
          { label: 'Containers', link: 'docker.containers' },
          'Add container',
        ]}
      />

      <CreateForm />
    </>
  );
}

function CreateForm() {
  const environmentId = useEnvironmentId();
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const { isAdmin } = useCurrentUser();

  const initialValuesQuery = useInitialValues();
  const registriesQuery = useEnvironmentRegistries(environmentId);

  const mutation = useCreateOrReplaceMutation();

  const [name, setName] = useState('');
  const debouncedName = useDebouncedValue(name, 1000);
  const oldContainerQuery = useContainers(environmentId, {
    filters: {
      name: [`^/${debouncedName}$`],
    },
  });

  const { maxCpu, maxMemory } = useSystemLimits(environmentId);

  const envQuery = useCurrentEnvironment();
  if (!envQuery.data || !initialValuesQuery) {
    return null;
  }

  const environment = envQuery.data;

  const oldContainer =
    oldContainerQuery.data && oldContainerQuery.data.length > 0
      ? oldContainerQuery.data[0]
      : undefined;

  const { isDuplicating = false, initialValues } = initialValuesQuery;

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={() =>
        validation({
          isAdmin,
          maxCpu,
          maxMemory,
          isDuplicating,
          isDuplicatingPortainer: oldContainer?.IsPortainer,
        })
      }
    >
      <InnerForm
        onChangeName={setName}
        isDuplicate={isDuplicating}
        isLoading={mutation.isLoading}
      />
    </Formik>
  );

  async function handleSubmit(values: Values) {
    if (oldContainer) {
      const confirmed = await confirmDestructive({
        title: 'Are you sure?',
        message:
          'A container with the same name already exists. Portainer can automatically remove it and re-create one. Do you want to replace it?',
        confirmButton: buildConfirmButton('Replace', 'danger'),
      });

      if (!confirmed) {
        return;
      }
    }

    const registry = getRegistry(values.image, registriesQuery.data || []);
    const config = buildConfig(values, registry);

    mutation.mutate(
      { config, environment, values, registry, oldContainer },
      {
        onSuccess() {
          sendAnalytics(values, registry);
          notifySuccess('Success', 'Container successfully created');
          router.stateService.go('docker.containers');
        },
      }
    );
  }

  function sendAnalytics(values: Values, registry?: Registry) {
    const containerImage = registry?.URL
      ? `${registry?.URL}/${values.image}`
      : values.image;
    if (values.resources.gpu.enabled) {
      trackEvent('gpuContainerCreated', {
        category: 'docker',
        metadata: { gpu: values.resources.gpu, containerImage },
      });
    }
  }
}

function buildConfig(values: Values, registry?: Registry) {
  let config: CreateContainerRequest = {
    Image: '',
    Env: [],
    MacAddress: '',
    ExposedPorts: {},
    WorkingDir: '',
    User: '',
    HostConfig: {
      RestartPolicy: {
        Name: 'no',
      },
      PortBindings: {},
      PublishAllPorts: false,
      Binds: [],
      AutoRemove: false,
      NetworkMode: 'bridge',
      Privileged: false,
      Init: false,
      ExtraHosts: [],
      Devices: [],
      DeviceRequests: [],
      CapAdd: [],
      CapDrop: [],
      Sysctls: {},
      LogConfig: {
        Type: 'none',
        Config: {},
      },
    },
    NetworkingConfig: {
      EndpointsConfig: {},
    },
    Labels: {},
  };

  config = parseCommandsTabRequest(config, values.commands);
  config = parseVolumesTabRequest(config, values.volumes);
  config = parseNetworkTabRequest(config, values.network, '');
  config = parseLabelsTabRequest(config, values.labels);
  config = parseRestartPolicyTabRequest(config, values.restartPolicy);
  config = parseResourcesTabRequest(config, values.resources);
  config = parseCapabilitiesTabRequest(config, values.capabilities);
  config = parseBaseFormRequest(config, values);
  config.Env = convertToArrayOfStrings(values.env);
  config.Image = buildImageFullURI(values.image.image, registry);

  return config;
}

function getRegistry(image: ImageConfigValues, registries: Registry[]) {
  return image.useRegistry
    ? registries.find((registry) => registry.Id === image.registryId)
    : undefined;
}
