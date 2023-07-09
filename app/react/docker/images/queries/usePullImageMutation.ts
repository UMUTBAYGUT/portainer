/**
 * PULL IMAGE
 */

import axios, { parseAxiosError } from '@/portainer/services/axios';
import { EnvironmentId } from '@/react/portainer/environments/types';
import { Registry } from '@/react/portainer/registries/types/registry';

import { buildUrl } from '../../proxy/queries/build-url';
import { buildImageFullURI } from '../utils';

import { encodeRegistryCredentials } from './encodeRegistryCredentials';

export async function pullImage(
  environmentId: EnvironmentId,
  image: string,
  registry?: Registry,
  ignoreErrors = false
) {
  const authenticationDetails =
    registry && registry.Authentication
      ? encodeRegistryCredentials(registry.Id)
      : '';

  const imageURI = buildImageFullURI(image, registry);

  try {
    await axios.post(buildUrl(environmentId, 'create'), null, {
      params: {
        fromImage: imageURI,
      },
      headers: {
        'X-Registry-Auth': authenticationDetails,
      },
    });
  } catch (err) {
    if (ignoreErrors) {
      return;
    }

    throw parseAxiosError(err as Error, 'Unable to pull image');
  }
}
