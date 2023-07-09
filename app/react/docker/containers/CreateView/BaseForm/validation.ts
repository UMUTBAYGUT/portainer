import { boolean, object, SchemaOf, string } from 'yup';

import { validationSchema as accessControlSchema } from '@/react/portainer/access-control/AccessControlForm/AccessControlForm.validation';

import { imageConfigValidation } from '@@/ImageConfigFieldset';

import { Values } from './BaseForm';
import { validationSchema as portsSchema } from './PortsMappingField.validation';

export function validation(
  {
    isAdmin,
  }: {
    isAdmin: boolean;
  } = { isAdmin: false }
): SchemaOf<Values> {
  return object({
    name: string().required('Name is required'),
    alwaysPull: boolean().default(true),
    accessControl: accessControlSchema(isAdmin),
    autoRemove: boolean().default(false),
    enableWebhook: boolean().default(false),
    nodeName: string().default(''),
    ports: portsSchema(),
    publishAllPorts: boolean().default(false),
    image: imageConfigValidation(),
  });
}
