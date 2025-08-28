import fs from 'node:fs';
import path from 'node:path';
import { HttpResponse, http } from 'msw';

const DEFAULT_IMAGE_NAME = 'image';
const DEFAULT_IMAGE_EXTENSION = 'jpg';

export const BASE_URL = 'https://example.com';

export const handlers = [
  http.get(BASE_URL, () => {
    return HttpResponse.text('OK');
  }),

  http.get(`${BASE_URL}/:imageName`, ({ params }) => {
    let { imageName } = params; // string or array

    if (typeof imageName !== 'string') {
      imageName = imageName[0];
    }

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

    const imagePath = path.resolve(import.meta.dirname, '..', imageName);

    // Return 404 if the image path doesn't exist.
    if (!fs.existsSync(imagePath)) {
      return HttpResponse.json('Not Found', {
        status: 404,
      });
    }

    return new HttpResponse(fs.createReadStream(imagePath), {
      headers: {
        'Content-Type': 'image/*',
      },
    });
  }),
] as const;
