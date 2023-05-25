import { useFormikContext } from 'formik';

import { useCurrentEnvironment } from '@/react/hooks/useCurrentEnvironment';
import { Authorized } from '@/react/hooks/useUser';
import { AccessControlForm } from '@/react/portainer/access-control';
import { AccessControlFormData } from '@/react/portainer/access-control/types';
import { EnvironmentType } from '@/react/portainer/environments/types';
import { NodeSelector } from '@/react/docker/agent/NodeSelector';
import { useInfo } from '@/react/docker/proxy/queries/useInfo';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';
import { isAgentEnvironment } from '@/react/portainer/environments/utils';

import { FormControl } from '@@/form-components/FormControl';
import { FormSection } from '@@/form-components/FormSection';
import { Input } from '@@/form-components/Input';
import { SwitchField } from '@@/form-components/SwitchField';
import { ImageConfigFieldset, ImageConfigValues } from '@@/ImageConfigFieldset';
import { LoadingButton } from '@@/buttons';
import { Widget } from '@@/Widget';

import { PortsMappingField } from './PortsMappingField';

export interface Values {
  name: string;
  enableWebhook: boolean;
  publishAllPorts: boolean;
  image: ImageConfigValues;
  alwaysPull: boolean;
  ports: Array<{
    containerPort: string;
    hostPort: string;
    protocol: 'tcp' | 'udp';
  }>;
  accessControl: AccessControlFormData;
  nodeName: string;
  autoRemove: boolean;
}

function useIsAgentOnSwarm() {
  const environmentId = useEnvironmentId();
  const environmentQuery = useCurrentEnvironment();

  const isSwarmQuery = useInfo(environmentId, (info) => !!info.Swarm?.NodeID);

  return (
    !!environmentQuery.data &&
    isAgentEnvironment(environmentQuery.data?.Type) &&
    !!isSwarmQuery.data
  );
}

export function BaseForm({
  isValid,
  isLoading,
  onChangeName,
}: {
  isValid: boolean;
  isLoading: boolean;
  onChangeName: (value: string) => void;
}) {
  const { setFieldValue, values, errors, setFieldError } =
    useFormikContext<Values>();
  const environmentQuery = useCurrentEnvironment();
  const isAgentOnSwarm = useIsAgentOnSwarm();
  if (!environmentQuery.data) {
    return null;
  }

  const environment = environmentQuery.data;

  const canUseWebhook = environment.Type !== EnvironmentType.EdgeAgentOnDocker;

  return (
    <Widget>
      <Widget.Body>
        <FormControl label="Name" inputId="name-input" errors={errors?.name}>
          <Input
            id="name-input"
            value={values.name}
            onChange={(e) => {
              const name = e.target.value;
              onChangeName(name);
              setFieldValue('name', name);
            }}
            placeholder="e.g. myContainer"
          />
        </FormControl>

        <FormSection title="Image Configuration">
          <ImageConfigFieldset
            values={values.image}
            setValidity={(valid) => setFieldError('image', valid)}
            fieldNamespace="image"
            autoComplete
            checkRateLimits={values.alwaysPull}
            errors={errors?.image}
          >
            <div className="form-group">
              <div className="col-sm-12">
                <SwitchField
                  label="Always pull the image"
                  tooltip="When enabled, Portainer will automatically try to pull the specified image before creating the container."
                  checked={values.alwaysPull}
                  onChange={(alwaysPull) =>
                    setFieldValue('alwaysPull', alwaysPull)
                  }
                />
              </div>
            </div>
          </ImageConfigFieldset>
        </FormSection>

        {canUseWebhook && (
          <Authorized authorizations="PortainerWebhookCreate" adminOnlyCE>
            <FormSection title="Webhook">
              <div className="form-group">
                <div className="col-sm-12">
                  <SwitchField
                    label="Create a container webhook"
                    tooltip="Create a webhook (or callback URI) to automate the recreate this container. Sending a POST request to this callback URI (without requiring any authentication) will pull the most up-to-date version of the associated image and recreate this container."
                    checked={values.enableWebhook}
                    onChange={(enableWebhook) =>
                      setFieldValue('enableWebhook', enableWebhook)
                    }
                  />
                </div>
              </div>
            </FormSection>
          </Authorized>
        )}

        <FormSection title="Network ports configuration">
          <div className="form-group">
            <div className="col-sm-12">
              <SwitchField
                label="Publish all exposed ports to random host ports"
                tooltip="When enabled, Portainer will let Docker automatically map a random port on the host to each one defined in the image Dockerfile."
                checked={values.publishAllPorts}
                onChange={(publishAllPorts) =>
                  setFieldValue('publishAllPorts', publishAllPorts)
                }
              />
            </div>
          </div>

          <PortsMappingField
            value={values.ports}
            onChange={(ports) => setFieldValue('ports', ports)}
            errors={errors?.ports}
          />
        </FormSection>

        {isAgentOnSwarm && (
          <FormSection title="Deployment">
            <NodeSelector
              value={values.nodeName}
              onChange={(nodeName) => setFieldValue('nodeName', nodeName)}
            />
          </FormSection>
        )}

        <AccessControlForm
          onChange={(accessControl) =>
            setFieldValue('accessControl', accessControl)
          }
          errors={errors?.accessControl}
          values={values.accessControl}
        />

        <div className="form-group">
          <div className="col-sm-12">
            <SwitchField
              label="Auto remove"
              tooltip="When enabled, Portainer will automatically remove the container when it exits. This is useful when you want to use the container only once."
              checked={values.autoRemove}
              onChange={(autoRemove) => setFieldValue('autoRemove', autoRemove)}
            />
          </div>
        </div>

        <div className="form-group">
          <div className="col-sm-12">
            <LoadingButton
              loadingText="Deployment in progress..."
              isLoading={isLoading}
              disabled={!isValid}
            >
              Deploy the container
            </LoadingButton>
          </div>
        </div>
      </Widget.Body>
    </Widget>
  );
}
