import fastify from 'fastify';
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'path';

const DEFAULT_IMAGE_NAME = '200x300';
const DEFAULT_IMAGE_EXTENSION = 'jpg';

export function buildFastify() {
  const server = fastify();

  server.get('/', async () => {
    return 'OK';
  });

  server.get('/images/:name', async (req, res) => {
    let imageName = (req.params as { name: string }).name;

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

    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const imagePath = path.resolve(dirname, '..', imageName);

    return await new Promise<fastify.FastifyReply>((resolve) => {
      fs.readFile(imagePath, (err, data) => {
        if (err) {
          resolve(res.status(404).send('Not Found'));
        } else {
          resolve(res.type('image/*').send(data));
        }
      });
    });
  });

  server.setNotFoundHandler((req, res) => {
    res.status(404).send('Not Found');
  });

  return server;
}
