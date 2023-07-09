import _ from 'lodash-es';

import * as envVarsUtils from '@/react/components/form-components/EnvironmentVariablesFieldset/utils';

import { confirmDestructive } from '@@/modals/confirm';
import { FeatureId } from '@/react/portainer/feature-flags/enums';
import { buildConfirmButton } from '@@/modals/utils';

import { parseBaseFormRequest, parseBaseFormViewModel } from '@/react/docker/containers/CreateView/BaseForm';
import { parseCommandsTabRequest, parseCommandsTabViewModel } from '@/react/docker/containers/CreateView/CommandsTab';
import { parseVolumesTabRequest, parseVolumesTabViewModel } from '@/react/docker/containers/CreateView/VolumesTab';
import { parseNetworkTabRequest, parseNetworkTabViewModel } from '@/react/docker/containers/CreateView/NetworkTab';
import { parseLabelsTabRequest, parseLabelsTabViewModel } from '@/react/docker/containers/CreateView/LabelsTab';
import { parseResourcesTabRequest, parseResourcesTabViewModel } from '@/react/docker/containers/CreateView/ResourcesTab';
import { parseCapabilitiesTabRequest, parseCapabilitiesTabViewModel } from '@/react/docker/containers/CreateView/CapabilitiesTab';
import { parseRequest as parseResourcesRequest } from '@/react/docker/containers/CreateView/ResourcesTab/ResourcesFieldset';
import { ContainerDetailsViewModel } from '@/docker/models/container';
import { getContainers } from '@/react/docker/containers/queries/containers';
import './createcontainer.css';
import { RegistryTypes } from '@/react/portainer/registries/types/registry';
import { buildImageFullURI } from '@/react/docker/images/utils';

angular.module('portainer.docker').controller('CreateContainerController', [
  '$q',
  '$scope',
  '$async',
  '$state',
  '$timeout',
  '$transition$',
  '$analytics',
  'Container',
  'ContainerHelper',
  'Image',
  'ImageHelper',
  'NetworkService',
  'ResourceControlService',
  'Authentication',
  'Notifications',
  'ContainerService',
  'ImageService',
  'FormValidator',
  'RegistryService',
  'SystemService',
  'SettingsService',
  'HttpRequestHelper',
  'endpoint',
  'EndpointService',
  function (
    $q,
    $scope,
    $async,
    $state,
    $timeout,
    $transition$,
    $analytics,
    Container,
    ContainerHelper,
    Image,
    ImageHelper,
    NetworkService,
    ResourceControlService,
    Authentication,
    Notifications,
    ContainerService,
    ImageService,
    FormValidator,
    RegistryService,
    SystemService,
    SettingsService,
    HttpRequestHelper,
    endpoint,
    EndpointService
  ) {
    $scope.create = create;
    $scope.endpoint = endpoint;
    $scope.containerWebhookFeature = FeatureId.CONTAINER_WEBHOOK;
    $scope.isAdmin = Authentication.isAdmin();
    const userDetails = this.Authentication.getUserDetails();

    $scope.formValues = {
      Env: [],
      commands: parseCommandsTabViewModel(),
      volumes: parseVolumesTabViewModel(),
      network: parseNetworkTabViewModel(),
      labels: parseLabelsTabViewModel(),
      restartPolicy: 'no',
      resources: parseResourcesTabViewModel(),
      capabilities: [],
      ...parseBaseFormViewModel($scope.isAdmin, userDetails.ID),
    };

    $scope.state = {
      formValidationError: '',
      actionInProgress: false,
      mode: '',
      pullImageValidity: true,
      settingUnlimitedResources: false,
    };

    $scope.handleCommandsChange = handleCommandsChange;
    $scope.onChange = onChange;

    function onChange(values) {
      $scope.formValues = {
        ...$scope.formValues,
        ...values,
      };
    }

    function handleCommandsChange(commands) {
      return $scope.$evalAsync(() => {
        $scope.formValues.commands = commands;
      });
    }

    $scope.isDuplicateValid = function () {
      if (!$scope.fromContainer) {
        return true;
      }

      const duplicatingPortainer = $scope.fromContainer.IsPortainer && $scope.fromContainer.Name === '/' + $scope.config.name;
      const duplicatingWithRegistry = !!$scope.formValues.image.registryId;

      return !duplicatingPortainer && duplicatingWithRegistry;
    };

    $scope.onVolumesChange = function (volumes) {
      return $scope.$evalAsync(() => {
        $scope.formValues.volumes = volumes;
      });
    };

    $scope.onNetworkChange = function (network) {
      return $scope.$evalAsync(() => {
        $scope.formValues.network = network;
      });
    };

    $scope.onLabelsChange = function (labels) {
      return $scope.$evalAsync(() => {
        $scope.formValues.labels = labels;
      });
    };

    $scope.onRestartPolicyChange = function (restartPolicy) {
      return $scope.$evalAsync(() => {
        $scope.formValues.restartPolicy = restartPolicy;
      });
    };

    $scope.onResourcesChange = function (resources) {
      return $scope.$evalAsync(() => {
        $scope.formValues.resources = resources;
      });
    };

    $scope.onCapabilitiesChange = function (capabilities) {
      return $scope.$evalAsync(() => {
        $scope.formValues.capabilities = capabilities;
      });
    };

    $scope.handleEnvVarChange = handleEnvVarChange;
    function handleEnvVarChange(value) {
      $scope.formValues.Env = value;
    }

    $scope.refreshSlider = function () {
      $timeout(function () {
        $scope.$broadcast('rzSliderForceRender');
      });
    };

    $scope.onImageNameChange = function () {
      $scope.formValues.CmdMode = 'default';
      $scope.formValues.EntrypointMode = 'default';
    };

    $scope.setPullImageValidity = setPullImageValidity;
    function setPullImageValidity(validity) {
      if (!validity) {
        $scope.formValues.alwaysPull = false;
      }
      $scope.state.pullImageValidity = validity;
    }

    $scope.config = {
      Image: '',
      Env: [],
      Cmd: null,
      MacAddress: '',
      ExposedPorts: {},
      Entrypoint: null,
      WorkingDir: '',
      User: '',
      HostConfig: {
        RestartPolicy: {
          Name: 'no',
        },
        PortBindings: [],
        PublishAllPorts: false,
        Binds: [],
        AutoRemove: false,
        NetworkMode: 'bridge',
        Privileged: false,
        Init: false,
        Runtime: null,
        ExtraHosts: [],
        Devices: [],
        DeviceRequests: [],
        CapAdd: [],
        CapDrop: [],
        Sysctls: {},
        LogConfig: {
          Type: '',
          Config: {},
        },
      },
      NetworkingConfig: {
        EndpointsConfig: {},
      },
      Labels: {},
    };

    async function prepareImageConfig() {
      const registryModel = await getRegistryModel();

      return buildImageFullURI(registryModel);
    }

    function prepareEnvironmentVariables(config) {
      config.Env = envVarsUtils.convertToArrayOfStrings($scope.formValues.Env);
    }

    async function prepareConfiguration() {
      var config = angular.copy($scope.config);
      config = parseCommandsTabRequest(config, $scope.formValues.commands);
      config = parseVolumesTabRequest(config, $scope.formValues.volumes);
      config = parseNetworkTabRequest(config, $scope.formValues.network, $scope.fromContainer.Id);
      config = parseLabelsTabRequest(config, $scope.formValues.labels);
      config.HostConfig.RestartPolicy.Name = $scope.formValues.restartPolicy;
      config = parseResourcesTabRequest(config, $scope.formValues.resources);
      config = parseCapabilitiesTabRequest(config, $scope.formValues.capabilities);
      config = parseBaseFormRequest(config, $scope.formValues);

      config.name = $scope.formValues.name;
      prepareEnvironmentVariables(config);

      config.Image = await prepareImageConfig(config);

      return config;
    }

    function loadFromContainerEnvironmentVariables() {
      $scope.formValues.Env = envVarsUtils.parseArrayOfStrings($scope.config.Env);
    }

    function loadFromContainerSpec() {
      // Get container
      Container.get({ id: $transition$.params().from })
        .$promise.then(async function success(d) {
          var fromContainer = new ContainerDetailsViewModel(d);

          $scope.fromContainer = fromContainer;
          $scope.state.mode = 'duplicate';
          $scope.config = ContainerHelper.configFromContainer(angular.copy(d));

          const imageModel = await RegistryService.retrievePorRegistryModelFromRepository($scope.config.Image, endpoint.Id);

          $scope.formValues = parseBaseFormViewModel(
            $scope.isAdmin,
            userDetails.ID,
            d,
            {
              image: imageModel.Image,
              useRegistry: imageModel.UseRegistry,
              registryId: imageModel.Registry.Id,
            },
            false,
            $scope.formValues.NodeName
          );

          $scope.formValues.commands = parseCommandsTabViewModel(d);
          $scope.formValues.volumes = parseVolumesTabViewModel(d);

          $scope.formValues.network = parseNetworkTabViewModel(d, $scope.availableNetworks, $scope.runningContainers);
          $scope.extraNetworks = Object.fromEntries(
            Object.entries(d.NetworkSettings.Networks)
              .filter(([n]) => n !== $scope.formValues.network.networkMode)
              .map(([networkName, network]) => [
                networkName,
                network.Aliases && fromContainer
                  ? {
                      ...network,
                      Aliases: (network.Aliases || []).filter((o) => {
                        return !fromContainer.Id.startsWith(o);
                      }),
                    }
                  : network,
              ])
          );

          $scope.formValues.labels = parseLabelsTabViewModel(d);
          $scope.formValues.restartPolicy = d.HostConfig.RestartPolicy.Name;
          $scope.formValues.resources = parseResourcesTabViewModel(d);
          $scope.formValues.capabilities = parseCapabilitiesTabViewModel(d);

          loadFromContainerEnvironmentVariables(d);
        })
        .catch(function error(err) {
          Notifications.error('Failure', err, 'Unable to retrieve container');
        });
    }

    async function initView() {
      var nodeName = $transition$.params().nodeName;
      $scope.formValues.NodeName = nodeName;
      HttpRequestHelper.setPortainerAgentTargetHeader(nodeName);

      $scope.showDeviceMapping = await shouldShowDevices();
      $scope.showSysctls = await shouldShowSysctls();
      $scope.areContainerCapabilitiesEnabled = await checkIfContainerCapabilitiesEnabled();
      $scope.isAdminOrEndpointAdmin = Authentication.isAdmin();

      var provider = $scope.applicationState.endpoint.mode.provider;
      var apiVersion = $scope.applicationState.endpoint.apiVersion;
      NetworkService.networks(provider === 'DOCKER_STANDALONE' || provider === 'DOCKER_SWARM_MODE', false, provider === 'DOCKER_SWARM_MODE' && apiVersion >= 1.25)
        .then(function success(networks) {
          networks.push({ Name: 'container' });
          $scope.availableNetworks = networks.sort((a, b) => a.Name.localeCompare(b.Name));

          if (_.find(networks, { Name: 'nat' })) {
            $scope.config.HostConfig.NetworkMode = 'nat';
          }
        })
        .catch(function error(err) {
          Notifications.error('Failure', err, 'Unable to retrieve networks');
        });
      getContainers(endpoint.Id)
        .then((containers) => {
          $scope.runningContainers = containers;
          $scope.gpuUseAll = _.get($scope, 'endpoint.Snapshots[0].GpuUseAll', false);
          $scope.gpuUseList = _.get($scope, 'endpoint.Snapshots[0].GpuUseList', []);
          if ($transition$.params().from) {
            loadFromContainerSpec();
          } else {
            $scope.fromContainer = {};
            if ($scope.areContainerCapabilitiesEnabled) {
              $scope.formValues.capabilities = parseCapabilitiesTabViewModel();
            }
          }
        })
        .catch((e) => {
          Notifications.error('Failure', e, 'Unable to retrieve running containers');
        });

      SystemService.info()
        .then(function success(data) {
          $scope.availableRuntimes = data.Runtimes ? Object.keys(data.Runtimes) : [];
          $scope.state.sliderMaxCpu = 32;
          if (data.NCPU) {
            $scope.state.sliderMaxCpu = data.NCPU;
          }
          $scope.state.sliderMaxMemory = 32768;
          if (data.MemTotal) {
            $scope.state.sliderMaxMemory = Math.floor(data.MemTotal / 1000 / 1000);
          }
        })
        .catch(function error(err) {
          Notifications.error('Failure', err, 'Unable to retrieve engine details');
        });

      $scope.allowBindMounts = $scope.isAdminOrEndpointAdmin || endpoint.SecuritySettings.allowBindMountsForRegularUsers;
      $scope.allowPrivilegedMode = endpoint.SecuritySettings.allowPrivilegedModeForRegularUsers;
    }

    $scope.updateLimits = updateLimits;
    async function updateLimits(resourceValues) {
      const settingUnlimitedResources =
        (resourceValues.MemoryLimit === 0 && $scope.config.HostConfig.Memory > 0) ||
        (resourceValues.MemoryReservation === 0 && $scope.config.HostConfig.MemoryReservation > 0) ||
        (resourceValues.CpuLimit === 0 && $scope.config.HostConfig.NanoCpus > 0);

      if (settingUnlimitedResources) {
        create();
        return;
      }

      try {
        let config = angular.copy($scope.config);
        config.HostConfig = parseResourcesRequest(config.HostConfig, resourceValues);
        await ContainerService.updateLimits($transition$.params().from, config);
        $scope.config = config;
      } catch (err) {
        Notifications.error('Failure', err, 'Update Limits fail');
      }
    }

    function create() {
      var oldContainer = null;
      HttpRequestHelper.setPortainerAgentTargetHeader($scope.formValues.NodeName);
      return findCurrentContainer().then(setOldContainer).then(confirmCreateContainer).then(startCreationProcess).catch(notifyOnError).finally(final);

      function final() {
        $scope.state.actionInProgress = false;
      }

      function setOldContainer(container) {
        oldContainer = container;
        return container;
      }

      function findCurrentContainer() {
        return Container.query({ all: 1, filters: { name: ['^/' + $scope.formValues.name + '$'] } })
          .$promise.then(function onQuerySuccess(containers) {
            if (!containers.length) {
              return;
            }
            return containers[0];
          })
          .catch(notifyOnError);

        function notifyOnError(err) {
          Notifications.error('Failure', err, 'Unable to retrieve containers');
        }
      }

      function startCreationProcess(confirmed) {
        if (!confirmed) {
          return $q.when();
        }

        $scope.state.actionInProgress = true;
        return pullImageIfNeeded()
          .then(stopAndRenameContainer)
          .then(createNewContainer)
          .then(applyResourceControl)
          .then(connectToExtraNetworks)
          .then(removeOldContainer)
          .then(onSuccess, onCreationProcessFail);
      }

      function onCreationProcessFail(error) {
        var deferred = $q.defer();
        removeNewContainer()
          .then(restoreOldContainerName)
          .then(function () {
            deferred.reject(error);
          })
          .catch(function (restoreError) {
            deferred.reject(restoreError);
          });
        return deferred.promise;
      }

      function removeNewContainer() {
        return findCurrentContainer().then(function onContainerLoaded(container) {
          if (container && (!oldContainer || container.Id !== oldContainer.Id)) {
            return ContainerService.remove(container, true);
          }
        });
      }

      function restoreOldContainerName() {
        if (!oldContainer) {
          return;
        }
        return ContainerService.renameContainer(oldContainer.Id, oldContainer.Names[0]);
      }

      function confirmCreateContainer(container) {
        if (!container) {
          return $q.when(true);
        }

        return showConfirmationModal();

        function showConfirmationModal() {
          var deferred = $q.defer();

          confirmDestructive({
            title: 'Are you sure?',
            message: 'A container with the same name already exists. Portainer can automatically remove it and re-create one. Do you want to replace it?',
            confirmButton: buildConfirmButton('Replace', 'danger'),
          }).then(function onConfirm(confirmed) {
            deferred.resolve(confirmed);
          });

          return deferred.promise;
        }
      }

      function stopAndRenameContainer() {
        if (!oldContainer) {
          return $q.when();
        }
        return stopContainerIfNeeded(oldContainer).then(renameContainer);
      }

      function stopContainerIfNeeded(oldContainer) {
        if (oldContainer.State !== 'running') {
          return $q.when();
        }
        return ContainerService.stopContainer(oldContainer.Id);
      }

      function renameContainer() {
        return ContainerService.renameContainer(oldContainer.Id, oldContainer.Names[0] + '-old');
      }

      async function pullImageIfNeeded() {
        if (!$scope.formValues.alwaysPull) {
          return;
        }
        const registryModel = await getRegistryModel();
        return ImageService.pullImage(registryModel, true);
      }

      function createNewContainer() {
        return $async(async () => {
          const config = await prepareConfiguration();

          return await ContainerService.createAndStartContainer(config);
        });
      }

      async function sendAnalytics() {
        const publicSettings = await SettingsService.publicSettings();
        const analyticsAllowed = publicSettings.EnableTelemetry;
        const registryModel = await getRegistryModel();
        const image = `${registryModel.Registry.URL}/${registryModel.Image}`;
        if (analyticsAllowed && $scope.formValues.GPU.enabled) {
          $analytics.eventTrack('gpuContainerCreated', {
            category: 'docker',
            metadata: { gpu: $scope.formValues.GPU, containerImage: image },
          });
        }
      }

      function applyResourceControl(newContainer) {
        const userId = Authentication.getUserDetails().ID;
        const resourceControl = newContainer.Portainer.ResourceControl;
        const containerId = newContainer.Id;
        const accessControlData = $scope.formValues.accessControl;

        return ResourceControlService.applyResourceControl(userId, accessControlData, resourceControl).then(function onApplyResourceControlSuccess() {
          return containerId;
        });
      }

      function connectToExtraNetworks(newContainerId) {
        if (!$scope.extraNetworks) {
          return $q.when();
        }

        var connectionPromises = _.forOwn($scope.extraNetworks, function (network, networkName) {
          if (_.has(network, 'Aliases')) {
            var aliases = _.filter(network.Aliases, (o) => {
              return !_.startsWith($scope.fromContainer.Id, o);
            });
          }
          return NetworkService.connectContainer(networkName, newContainerId, aliases);
        });

        return $q.all(connectionPromises);
      }

      function removeOldContainer() {
        var deferred = $q.defer();

        if (!oldContainer) {
          deferred.resolve();
          return;
        }

        ContainerService.remove(oldContainer, true).then(notifyOnRemoval).catch(notifyOnRemoveError);

        return deferred.promise;

        function notifyOnRemoval() {
          Notifications.success('Container Removed', oldContainer.Id);
          deferred.resolve();
        }

        function notifyOnRemoveError(err) {
          deferred.reject({ msg: 'Unable to remove container', err: err });
        }
      }

      function notifyOnError(err) {
        Notifications.error('Failure', err, 'Unable to create container');
      }

      async function onSuccess() {
        await sendAnalytics();
        Notifications.success('Success', 'Container successfully created');
        $state.go('docker.containers', {}, { reload: true });
      }
    }

    async function shouldShowDevices() {
      return endpoint.SecuritySettings.allowDeviceMappingForRegularUsers || Authentication.isAdmin();
    }

    async function shouldShowSysctls() {
      return endpoint.SecuritySettings.allowSysctlSettingForRegularUsers || Authentication.isAdmin();
    }

    async function checkIfContainerCapabilitiesEnabled() {
      return endpoint.SecuritySettings.allowContainerCapabilitiesForRegularUsers || Authentication.isAdmin();
    }

    async function getRegistryModel() {
      const image = $scope.formValues.image;
      const registries = await EndpointService.registries(endpoint.Id);
      return {
        Image: image.image,
        UseRegistry: image.useRegistry,
        Registry: registries.find((registry) => registry.Id === image.registryId) || {
          Id: 0,
          Name: 'Docker Hub',
          Type: RegistryTypes.ANONYMOUS,
        },
      };
    }

    initView();
  },
]);
