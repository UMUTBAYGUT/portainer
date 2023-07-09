import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Form, Formik, useFormikContext } from 'formik';
import { useCurrentStateAndParams, useRouter } from '@uirouter/react';

import {
  BaseForm,
  parseBaseFormRequest,
  parseBaseFormViewModel,
} from '@/react/docker/containers/CreateView/BaseForm';
import {
  CapabilitiesTab,
  parseCapabilitiesTabRequest,
  parseCapabilitiesTabViewModel,
} from '@/react/docker/containers/CreateView/CapabilitiesTab';
import {
  CommandsTab,
  parseCommandsTabRequest,
  parseCommandsTabViewModel,
} from '@/react/docker/containers/CreateView/CommandsTab';
import {
  LabelsTab,
  parseLabelsTabRequest,
  parseLabelsTabViewModel,
} from '@/react/docker/containers/CreateView/LabelsTab';
import {
  NetworkTab,
  parseNetworkTabRequest,
  parseNetworkTabViewModel,
} from '@/react/docker/containers/CreateView/NetworkTab';
import {
  ResourcesTab,
  parseResourcesTabRequest,
  parseResourcesTabViewModel,
} from '@/react/docker/containers/CreateView/ResourcesTab';
import { RestartPolicyTab } from '@/react/docker/containers/CreateView/RestartPolicyTab';
import {
  VolumesTab,
  parseVolumesTabRequest,
  parseVolumesTabViewModel,
} from '@/react/docker/containers/CreateView/VolumesTab';
import { useCurrentUser, useIsEnvironmentAdmin } from '@/react/hooks/useUser';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';
import { useCurrentEnvironment } from '@/react/hooks/useCurrentEnvironment';
import { useEnvironmentRegistries } from '@/react/portainer/environments/queries/useEnvironmentRegistries';
import { Registry } from '@/react/portainer/registries/types/registry';
import { notifySuccess } from '@/portainer/services/notifications';
import { useAnalytics } from '@/react/hooks/useAnalytics';
import { useDebouncedValue } from '@/react/hooks/useDebouncedValue';
import { getImageConfig } from '@/react/portainer/registries/utils/getImageConfig';
import { useWebhooks } from '@/react/portainer/webhooks/useWebhooks';

import { EnvironmentVariablesFieldset } from '@@/form-components/EnvironmentVariablesFieldset';
import { NavTabs } from '@@/NavTabs';
import { PageHeader } from '@@/PageHeader';
import { Widget } from '@@/Widget';
import {
  convertToArrayOfStrings,
  parseArrayOfStrings,
} from '@@/form-components/EnvironmentVariablesFieldset/utils';
import { ImageConfigValues } from '@@/ImageConfigFieldset';
import { confirmDestructive } from '@@/modals/confirm';
import { buildConfirmButton } from '@@/modals/utils';

import { useApiVersion } from '../../proxy/queries/useVersion';
import { buildImageFullURI } from '../../images/utils';
import { useContainer } from '../queries/container';
import { useContainers } from '../queries/containers';
import { useSystemLimits } from '../../proxy/queries/useInfo';

import { CreateContainerRequest } from './types';
import { parseRestartPolicyTabRequest } from './RestartPolicyTab/RestartPolicyTab';
import { useCreateOrReplaceMutation } from './useCreateMutation';
import { validation } from './validation';
import { useNetworksForSelector } from './NetworkTab/NetworkSelector';
import { Values } from './useInitialValues';

export function CreateView() {
  // const initialValues = useInitialValues();

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

// function useInitialValues() {
//   const {params: {from}} = useCurrentStateAndParams()
// }

function CreateForm() {
  const {
    params: { nodeName, from },
  } = useCurrentStateAndParams();

  const environmentId = useEnvironmentId();

  const fromContainerQuery = useContainer(environmentId, from);
  const [name, setName] = useState('');
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const networksQuery = useNetworksForSelector();
  const runningContainersQuery = useContainers(environmentId, { all: false });
  const { isAdmin, user } = useCurrentUser();

  const registriesQuery = useEnvironmentRegistries(environmentId);
  const mutation = useCreateOrReplaceMutation();

  const debouncedName = useDebouncedValue(name, 1000);
  const oldContainerQuery = useContainers(environmentId, {
    filters: {
      name: [`^/${debouncedName}$`],
    },
  });
  const webhookQuery = useWebhooks(
    { endpointId: environmentId, resourceId: from },
    { enabled: !!from }
  );

  const { maxCpu, maxMemory } = useSystemLimits(environmentId);

  const envQuery = useCurrentEnvironment();
  if (!envQuery.data) {
    return null;
  }

  const environment = envQuery.data;
  const oldContainer =
    oldContainerQuery.data && oldContainerQuery.data.length > 0
      ? oldContainerQuery.data[0]
      : undefined;

  const fromContainer = fromContainerQuery.data;

  const loadingFromContainer = !!(from && !fromContainer);
  if (
    !registriesQuery.data ||
    loadingFromContainer ||
    !networksQuery.data ||
    !runningContainersQuery.data ||
    (from && !webhookQuery.data)
  ) {
    return null;
  }

  const imageConfig = fromContainer?.Config?.Image
    ? getImageConfig(fromContainer?.Config?.Image, registriesQuery.data)
    : {
        image: '',
        useRegistry: true,
        registryId: 0,
      };

  const hasBridgeNetwork = networksQuery.data.some((n) => n.Name === 'bridge');
  const initialValues: Values = {
    commands: parseCommandsTabViewModel(fromContainer),
    volumes: parseVolumesTabViewModel(fromContainer),
    network: parseNetworkTabViewModel(
      fromContainer,
      hasBridgeNetwork,
      runningContainersQuery.data
    ),
    labels: parseLabelsTabViewModel(fromContainer),
    restartPolicy: fromContainer?.HostConfig?.RestartPolicy?.Name || 'no',
    resources: parseResourcesTabViewModel(fromContainer),
    capabilities: parseCapabilitiesTabViewModel(fromContainer),
    nodeName,
    image: imageConfig,
    enableWebhook: webhookQuery.data ? webhookQuery.data.length > 0 : false,
    env: parseArrayOfStrings(fromContainer?.Config?.Env),
    ...parseBaseFormViewModel(isAdmin, user.Id, fromContainer),
  };

  const isDuplicating = !!fromContainer;
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

function InnerForm({
  isLoading,
  isDuplicate,
  onChangeName,
}: {
  isDuplicate: boolean;
  isLoading: boolean;
  onChangeName: (value: string) => void;
}) {
  const { values, setFieldValue, errors, isValid } = useFormikContext<Values>();
  const environmentId = useEnvironmentId();
  const [tab, setTab] = useState('commands');
  const apiVersion = useApiVersion(environmentId);
  const isEnvironmentAdmin = useIsEnvironmentAdmin();
  const envQuery = useCurrentEnvironment();

  if (!envQuery.data) {
    return null;
  }

  const environment = envQuery.data;

  return (
    <Form>
      <div className="row">
        <div className="col-sm-12">
          <div className="form-horizontal">
            <BaseForm
              onChangeName={onChangeName}
              isLoading={isLoading}
              isValid={isValid}
            />

            <div className="mt-4">
              <Widget>
                <Widget.Title
                  title="Advanced container settings"
                  icon={Settings}
                />
                <Widget.Body>
                  <NavTabs<string>
                    onSelect={setTab}
                    selectedId={tab}
                    type="pills"
                    justified
                    options={[
                      {
                        id: 'commands',
                        label: 'Commands & logging',
                        children: (
                          <CommandsTab
                            apiVersion={apiVersion}
                            values={values.commands}
                            setFieldValue={(field, value) =>
                              setFieldValue(`commands.${field}`, value)
                            }
                          />
                        ),
                      },
                      {
                        id: 'volumes',
                        label: 'Volumes',
                        children: (
                          <VolumesTab
                            values={values.volumes}
                            onChange={(value) =>
                              setFieldValue('volumes', value)
                            }
                            errors={errors.volumes}
                            allowBindMounts={
                              isEnvironmentAdmin ||
                              environment.SecuritySettings
                                .allowBindMountsForRegularUsers
                            }
                          />
                        ),
                      },
                      {
                        id: 'network',
                        label: 'Network',
                        children: (
                          <NetworkTab
                            values={values.network}
                            setFieldValue={(field, value) =>
                              setFieldValue(`network.${field}`, value)
                            }
                          />
                        ),
                      },
                      {
                        id: 'env',
                        label: 'Env',
                        children: (
                          <EnvironmentVariablesFieldset
                            values={values.env}
                            onChange={(value) => setFieldValue('env', value)}
                            errors={errors.env}
                          />
                        ),
                      },
                      {
                        id: 'labels',
                        label: 'Labels',
                        children: (
                          <LabelsTab
                            values={values.labels}
                            onChange={(value) => setFieldValue('labels', value)}
                            errors={errors.labels}
                          />
                        ),
                      },
                      {
                        id: 'restart',
                        label: 'Restart policy',
                        children: (
                          <RestartPolicyTab
                            values={values.restartPolicy}
                            onChange={(value) =>
                              setFieldValue('restartPolicy', value)
                            }
                          />
                        ),
                      },
                      {
                        id: 'runtime',
                        label: 'Runtime & resources',
                        children: (
                          <ResourcesTab
                            values={values.resources}
                            errors={errors.resources}
                            setFieldValue={(field, value) =>
                              setFieldValue(`resources.${field}`, value)
                            }
                            allowPrivilegedMode={
                              isEnvironmentAdmin ||
                              environment.SecuritySettings
                                .allowPrivilegedModeForRegularUsers
                            }
                            isDevicesFieldVisible={
                              isEnvironmentAdmin ||
                              environment.SecuritySettings
                                .allowDeviceMappingForRegularUsers
                            }
                            isInitFieldVisible={apiVersion >= 1.37}
                            isSysctlFieldVisible={
                              isEnvironmentAdmin ||
                              environment.SecuritySettings
                                .allowSysctlSettingForRegularUsers
                            }
                            isImageInvalid={
                              !values.image.image ||
                              (typeof values.image.registryId === 'undefined' &&
                                !!isDuplicate)
                            }
                            isDuplicate={!!isDuplicate}
                            onUpdateLimits={async (limits) => {
                              console.log(limits);
                            }}
                          />
                        ),
                      },
                      {
                        id: 'capabilities',
                        label: 'Capabilities',
                        children: (
                          <CapabilitiesTab
                            values={values.capabilities}
                            onChange={(value) =>
                              setFieldValue('capabilities', value)
                            }
                          />
                        ),
                      },
                    ]}
                  />
                </Widget.Body>
              </Widget>
            </div>
          </div>
        </div>
      </div>
    </Form>
  );
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
