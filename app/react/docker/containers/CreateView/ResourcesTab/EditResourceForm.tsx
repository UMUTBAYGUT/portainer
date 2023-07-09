import { Form, Formik } from 'formik';
import { useMutation } from 'react-query';

import { notifySuccess } from '@/portainer/services/notifications';
import { mutationOptions, withError } from '@/react-tools/react-query';
import { useSystemLimits } from '@/react/docker/proxy/queries/useInfo';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';

import { LoadingButton } from '@@/buttons';
import { TextTip } from '@@/Tip/TextTip';

import {
  ResourceFieldset,
  resourcesValidation,
  Values,
} from './ResourcesFieldset';

export function EditResourcesForm({
  onSubmit,
  initialValues,
  isImageInvalid,
}: {
  initialValues: Values;
  onSubmit: (values: Values) => Promise<void>;
  isImageInvalid: boolean;
}) {
  const updateMutation = useMutation(
    onSubmit,
    mutationOptions(withError('Failed to update limits'))
  );

  const environmentId = useEnvironmentId();
  const systemLimits = useSystemLimits(environmentId);

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={() => resourcesValidation(systemLimits)}
    >
      {({ values, errors, setValues, dirty }) => (
        <Form className="edit-resources p-5">
          <ResourceFieldset
            values={values}
            onChange={setValues}
            errors={errors}
          />

          <div className="form-group">
            <div className="col-sm-12">
              <LoadingButton
                isLoading={updateMutation.isLoading}
                disabled={isImageInvalid || !dirty}
                loadingText="Update in progress..."
                type="submit"
              >
                Update Limits
              </LoadingButton>
            </div>
            {settingUnlimitedResources(values) && (
              <div className="col-sm-12">
                <TextTip>
                  Updating any resource value to &apos;unlimited&apos; will
                  redeploy this container.
                </TextTip>
              </div>
            )}
          </div>
        </Form>
      )}
    </Formik>
  );

  function handleSubmit(values: Values) {
    updateMutation.mutate(values, {
      onSuccess: () => {
        notifySuccess('Success', 'Limits updated');
      },
    });
  }

  function settingUnlimitedResources(values: Values) {
    return (
      (initialValues.limit > 0 && values.limit === 0) ||
      (initialValues.reservation > 0 && values.reservation === 0) ||
      (initialValues.cpu > 0 && values.cpu === 0)
    );
  }
}
