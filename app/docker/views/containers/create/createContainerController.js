import _ from 'lodash-es';

import * as envVarsUtils from '@/react/components/form-components/EnvironmentVariablesFieldset/utils';
import { PorImageRegistryModel } from 'Docker/models/porImageRegistry';

import { confirmDestructive } from '@@/modals/confirm';
import { FeatureId } from '@/react/portainer/feature-flags/enums';
import { buildConfirmButton } from '@@/modals/utils';

import { parseCommandsTabRequest, parseCommandsTabViewModel } from '@/react/docker/containers/CreateView/CommandsTab';
import { parseVolumesTabRequest, parseVolumesTabViewModel } from '@/react/docker/containers/CreateView/VolumesTab';
import { parseNetworkTabRequest, parseNetworkTabViewModel } from '@/react/docker/containers/CreateView/NetworkTab';
import { parseLabelsTabRequest, parseLabelsTabViewModel } from '@/react/docker/containers/CreateView/LabelsTab';
import { parseResourcesTabRequest, parseResourcesTabViewModel } from '@/react/docker/containers/CreateView/ResourcesTab';
import { parseCapabilitiesTabRequest, parseCapabilitiesTabViewModel } from '@/react/docker/containers/CreateView/CapabilitiesTab';
import { AccessControlFormData } from '@/portainer/components/accessControlForm/porAccessControlFormModel';
import { ContainerDetailsViewModel } from '@/docker/models/container';
import { getContainers } from '@/react/docker/containers/queries/containers';
import { parseRequest as parseResourcesRequest } from '@/react/docker/containers/CreateView/ResourcesTab/ResourcesFieldset';
import './createcontainer.css';

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
    endpoint
  ) {
    $scope.create = create;
    $scope.endpoint = endpoint;
    $scope.containerWebhookFeature = FeatureId.CONTAINER_WEBHOOK;
    $scope.formValues = {
      alwaysPull: true,
      GPU: {
        enabled: false,
        useSpecific: false,
        selectedGPUs: ['all'],
        capabilities: ['compute', 'utility'],
      },
      ExtraHosts: [],
      MacAddress: '',
      IPv4: '',
      IPv6: '',
      DnsPrimary: '',
      DnsSecondary: '',
      AccessControlData: new AccessControlFormData(),
      Env: [],
      NodeName: null,
      RegistryModel: new PorImageRegistryModel(),
      commands: parseCommandsTabViewModel(),
      volumes: parseVolumesTabViewModel(),
      network: parseNetworkTabViewModel(),
      labels: parseLabelsTabViewModel(),
      restartPolicy: 'no',
      resources: parseResourcesTabViewModel(),
      capabilities: [],
    };

    $scope.state = {
      formValidationError: '',
      actionInProgress: false,
      mode: '',
      pullImageValidity: true,
      settingUnlimitedResources: false,
    };

    $scope.onAlwaysPullChange = onAlwaysPullChange;
    $scope.handlePublishAllPortsChange = handlePublishAllPortsChange;
    $scope.handleAutoRemoveChange = handleAutoRemoveChange;
    $scope.handlePrivilegedChange = handlePrivilegedChange;
    $scope.handleInitChange = handleInitChange;
    $scope.handleCommandsChange = handleCommandsChange;

    function handleCommandsChange(commands) {
      return $scope.$evalAsync(() => {
        console.log('handleCommandsChange', commands);
        $scope.formValues.commands = commands;
      });
    }

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

    function onAlwaysPullChange(checked) {
      return $scope.$evalAsync(() => {
        $scope.formValues.alwaysPull = checked;
      });
    }

    function handlePublishAllPortsChange(checked) {
      return $scope.$evalAsync(() => {
        $scope.config.HostConfig.PublishAllPorts = checked;
      });
    }

    function handleAutoRemoveChange(checked) {
      return $scope.$evalAsync(() => {
        $scope.config.HostConfig.AutoRemove = checked;
      });
    }

    function handlePrivilegedChange(checked) {
      return $scope.$evalAsync(() => {
        $scope.config.HostConfig.Privileged = checked;
      });
    }

    function handleInitChange(checked) {
      return $scope.$evalAsync(() => {
        $scope.config.HostConfig.Init = checked;
      });
    }

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

    $scope.addPortBinding = function () {
      $scope.config.HostConfig.PortBindings.push({ hostPort: '', containerPort: '', protocol: 'tcp' });
    };

    $scope.removePortBinding = function (index) {
      $scope.config.HostConfig.PortBindings.splice(index, 1);
    };

    $scope.addExtraHost = function () {
      $scope.formValues.ExtraHosts.push({ value: '' });
    };

    $scope.removeExtraHost = function (index) {
      $scope.formValues.ExtraHosts.splice(index, 1);
    };

    $scope.addDevice = function () {
      $scope.config.HostConfig.Devices.push({ pathOnHost: '', pathInContainer: '' });
    };

    $scope.removeDevice = function (index) {
      $scope.config.HostConfig.Devices.splice(index, 1);
    };

    $scope.onGpuChange = function (values) {
      return $async(async () => {
        $scope.formValues.GPU = values;
      });
    };

    $scope.addSysctl = function () {
      $scope.formValues.Sysctls.push({ name: '', value: '' });
    };

    $scope.removeSysctl = function (index) {
      $scope.formValues.Sysctls.splice(index, 1);
    };

    $scope.fromContainerMultipleNetworks = false;

    function prepareImageConfig(config) {
      const imageConfig = ImageHelper.createImageConfigForContainer($scope.formValues.RegistryModel);
      config.Image = imageConfig.fromImage;
    }

    function preparePortBindings(config) {
      const bindings = ContainerHelper.preparePortBindings(config.HostConfig.PortBindings);
      config.ExposedPorts = {};
      _.forEach(bindings, (_, key) => (config.ExposedPorts[key] = {}));
      config.HostConfig.PortBindings = bindings;
    }

    function prepareEnvironmentVariables(config) {
      config.Env = envVarsUtils.convertToArrayOfStrings($scope.formValues.Env);
    }

    function prepareConfiguration() {
      var config = angular.copy($scope.config);
      config = parseCommandsTabRequest(config, $scope.formValues.commands);
      config = parseVolumesTabRequest(config, $scope.formValues.volumes);
      config = parseNetworkTabRequest(config, $scope.formValues.network, $scope.fromContainer.Id);
      config = parseLabelsTabRequest(config, $scope.formValues.labels);
      config.HostConfig.RestartPolicy.Name = $scope.formValues.restartPolicy;
      config = parseResourcesTabRequest(config, $scope.formValues.resources);
      config = parseCapabilitiesTabRequest(config, $scope.formValues.capabilities);

      prepareImageConfig(config);
      preparePortBindings(config);
      prepareEnvironmentVariables(config);

      return config;
    }

    function loadFromContainerPortBindings() {
      const bindings = ContainerHelper.sortAndCombinePorts($scope.config.HostConfig.PortBindings);
      $scope.config.HostConfig.PortBindings = bindings;
    }

    function loadFromContainerEnvironmentVariables() {
      $scope.formValues.Env = envVarsUtils.parseArrayOfStrings($scope.config.Env);
    }

    function loadFromContainerImageConfig() {
      RegistryService.retrievePorRegistryModelFromRepository($scope.config.Image, endpoint.Id)
        .then((model) => {
          $scope.formValues.RegistryModel = model;
        })
        .catch(function error(err) {
          Notifications.error('Failure', err, 'Unable to retrieve registry');
        });
    }

    function loadFromContainerSpec() {
      // Get container
      Container.get({ id: $transition$.params().from })
        .$promise.then(function success(d) {
          var fromContainer = new ContainerDetailsViewModel(d);
          if (fromContainer.ResourceControl) {
            if (fromContainer.ResourceControl.Public) {
              $scope.formValues.AccessControlData.AccessControlEnabled = false;
            }

            // When the container is create by duplicate/edit, the access permission
            // shouldn't be copied
            fromContainer.ResourceControl.UserAccesses = [];
            fromContainer.ResourceControl.TeamAccesses = [];
          }

          $scope.fromContainer = fromContainer;
          $scope.state.mode = 'duplicate';
          $scope.config = ContainerHelper.configFromContainer(angular.copy(d));

          $scope.formValues.commands = parseCommandsTabViewModel(d);
          $scope.formValues.volumes = parseVolumesTabViewModel(d);

          $scope.formValues.network = parseNetworkTabViewModel(d, $scope.availableNetworks, $scope.runningContainers);
          $scope.extraNetworks = Object.fromEntries(Object.entries(d.NetworkSettings.Networks).filter(([n]) => n !== $scope.formValues.network.networkMode));

          $scope.formValues.labels = parseLabelsTabViewModel(d);
          $scope.formValues.restartPolicy = d.HostConfig.RestartPolicy.Name;
          $scope.formValues.resources = parseResourcesTabViewModel(d);
          $scope.formValues.capabilities = parseCapabilitiesTabViewModel(d);

          loadFromContainerPortBindings(d);

          loadFromContainerEnvironmentVariables(d);

          loadFromContainerImageConfig(d);
        })
        .catch(function error(err) {
          Notifications.error('Failure', err, 'Unable to retrieve container');
        });
    }

    async function initView() {
      var nodeName = $transition$.params().nodeName;
      $scope.formValues.NodeName = nodeName;
      HttpRequestHelper.setPortainerAgentTargetHeader(nodeName);

      $scope.isAdmin = Authentication.isAdmin();
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

    function validateForm(accessControlData, isAdmin) {
      $scope.state.formValidationError = '';
      var error = '';
      error = FormValidator.validateAccessControl(accessControlData, isAdmin);

      if (error) {
        $scope.state.formValidationError = error;
        return false;
      }
      return true;
    }

    $scope.handleResourceChange = handleResourceChange;
    function handleResourceChange() {
      $scope.state.settingUnlimitedResources = false;
      if (
        ($scope.config.HostConfig.Memory > 0 && $scope.formValues.MemoryLimit === 0) ||
        ($scope.config.HostConfig.MemoryReservation > 0 && $scope.formValues.MemoryReservation === 0) ||
        ($scope.config.HostConfig.NanoCpus > 0 && $scope.formValues.CpuLimit === 0)
      ) {
        $scope.state.settingUnlimitedResources = true;
      }
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
        return Container.query({ all: 1, filters: { name: ['^/' + $scope.config.name + '$'] } })
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
        if (!validateAccessControl()) {
          return $q.when();
        }
        $scope.state.actionInProgress = true;
        return pullImageIfNeeded()
          .then(stopAndRenameContainer)
          .then(createNewContainer)
          .then(applyResourceControl)
          .then(connectToExtraNetworks)
          .then(removeOldContainer)
          .then(onSuccess)
          .catch(onCreationProcessFail);
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

      function pullImageIfNeeded() {
        return $q.when($scope.formValues.alwaysPull && ImageService.pullImage($scope.formValues.RegistryModel, true));
      }

      function createNewContainer() {
        return $async(async () => {
          const config = prepareConfiguration();
          return await ContainerService.createAndStartContainer(config);
        });
      }

      async function sendAnalytics() {
        const publicSettings = await SettingsService.publicSettings();
        const analyticsAllowed = publicSettings.EnableTelemetry;
        const image = `${$scope.formValues.RegistryModel.Registry.URL}/${$scope.formValues.RegistryModel.Image}`;
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
        const accessControlData = $scope.formValues.AccessControlData;

        return ResourceControlService.applyResourceControl(userId, accessControlData, resourceControl).then(function onApplyResourceControlSuccess() {
          return containerId;
        });
      }

      function connectToExtraNetworks(newContainerId) {
        if (!$scope.formValues.network.extraNetworks) {
          return $q.when();
        }

        var connectionPromises = _.forOwn($scope.formValues.network.extraNetworks, function (network, networkName) {
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

      function validateAccessControl() {
        var accessControlData = $scope.formValues.AccessControlData;
        return validateForm(accessControlData, $scope.isAdmin);
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

    initView();
  },
]);
