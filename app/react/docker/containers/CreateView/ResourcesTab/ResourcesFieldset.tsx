import { FormikErrors } from 'formik';
import { number, object, SchemaOf } from 'yup';

import { useInfo } from '@/react/docker/proxy/queries/useInfo';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';

import { FormControl } from '@@/form-components/FormControl';
import { FormSection } from '@@/form-components/FormSection';
import { Input } from '@@/form-components/Input';
import { Slider } from '@@/form-components/Slider';

import { CreateContainerRequest } from '../types';

import { toConfigMemory } from './memory-utils';

export interface Values {
  reservation: number;
  limit: number;
  cpu: number;
}

export function ResourceFieldset({
  values,
  onChange,
  errors,
}: {
  values: Values;
  onChange: (values: Values) => void;
  errors: FormikErrors<Values> | undefined;
}) {
  const { maxCpu, maxMemory } = useSystemLimits();

  return (
    <FormSection title="Resources">
      <FormControl label="Memory reservation (MB)" errors={errors?.reservation}>
        <SliderWithInput
          value={values.reservation}
          onChange={(value) => onChange({ ...values, reservation: value })}
          max={maxMemory}
        />
      </FormControl>

      <FormControl label="Memory limit (MB)" errors={errors?.limit}>
        <SliderWithInput
          value={values.limit}
          onChange={(value) => onChange({ ...values, limit: value })}
          max={maxMemory}
        />
      </FormControl>

      <FormControl label="Maximum CPU usage" errors={errors?.cpu}>
        <Slider
          value={values.cpu}
          onChange={(value) =>
            onChange({
              ...values,
              cpu: typeof value === 'number' ? value : value[0],
            })
          }
          min={0}
          max={maxCpu}
          step={0.1}
        />
      </FormControl>
    </FormSection>
  );
}

function SliderWithInput({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  max: number;
}) {
  return (
    <div className="flex items-center gap-4">
      {max && (
        <div className="flex-1">
          <Slider
            onChange={(value) =>
              onChange(typeof value === 'number' ? value : value[0])
            }
            value={value}
            min={0}
            max={max}
            step={256}
          />
        </div>
      )}
      <Input
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="w-32"
      />
    </div>
  );
}

export function parseRequest(
  oldConfig: CreateContainerRequest['HostConfig'],
  values: Values
): CreateContainerRequest['HostConfig'] {
  return {
    ...oldConfig,
    NanoCpus: cpu(values.cpu),
    MemoryReservation: toConfigMemory(values.reservation),
    Memory: toConfigMemory(values.limit),
  };

  function cpu(value: number) {
    if (value < 0) {
      return 0;
    }

    return value * 1000000000;
  }
}

export function resourcesValidation({
  maxMemory = Number.POSITIVE_INFINITY,
  maxCpu = Number.POSITIVE_INFINITY,
}: {
  maxMemory?: number;
  maxCpu?: number;
} = {}): SchemaOf<Values> {
  return object({
    reservation: number()
      .min(0)
      .max(maxMemory, `Value must be between 0 and ${maxMemory}`)
      .default(0),
    limit: number()
      .min(0)
      .max(maxMemory, `Value must be between 0 and ${maxMemory}`)
      .default(0),
    cpu: number()
      .min(0)
      .max(maxCpu, `Value must be between 0 and ${maxCpu}`)
      .default(0),
  });
}

export function useSystemLimits() {
  const environmentId = useEnvironmentId();
  const infoQuery = useInfo(environmentId);

  const maxCpu = infoQuery.data?.NCPU || 32;
  const maxMemory = infoQuery.data?.MemTotal
    ? Math.floor(infoQuery.data.MemTotal / 1000 / 1000)
    : 32768;

  return { maxCpu, maxMemory };
}
