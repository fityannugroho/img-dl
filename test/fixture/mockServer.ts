import nock from 'nock';
import path from 'path';
import fs from 'fs';
import { BASE_URL } from './constanta.js';

const DEFAULT_IMAGE_NAME = '200x300';
const DEFAULT_IMAGE_EXTENSION = 'jpg';

export function startMockServer() {
  const scope = nock(BASE_URL).persist();

  scope.get('/').reply(200, 'OK');

  scope
    .get((uri) => uri.startsWith('/images/'))
    .reply((uri) => {
      let imageName = path.basename(uri);

      // Use DEFAULT_IMAGE_NAME if the image name begins with 'img-' followed by a number.
      // either with or without an extension. For example, 'img-1', 'img-1.jpg', 'img-20.webp' are valid.
      const regex = /^img-[0-9]+(\.[a-zA-Z]+)?$/;
      if (regex.test(imageName)) {
        imageName =
          DEFAULT_IMAGE_NAME +
          (path.extname(imageName) || `.${DEFAULT_IMAGE_EXTENSION}`);
      }

      // When the image name doesn't have an extension, use the default extension.
      const extension = path.extname(imageName);

      if (!extension) {
        const regex = /\.[^.]*$/;
        if (!regex.test(imageName)) {
          imageName += `.${DEFAULT_IMAGE_EXTENSION}`;
        }
      }

      const imagePath = path.resolve(__dirname, imageName);

      // Return 404 if the image path doesn't exist.
      if (!fs.existsSync(imagePath)) {
        return [404, 'Not Found'];
      }

      return [
        200,
        fs.createReadStream(imagePath),
        { 'Content-Type': 'image/*' },
      ];
    });
}

export function stopMockServer() {
  nock.cleanAll();
}

export function isMockServerActive() {
  return nock.isActive();
}
