import fastify from 'fastify';
import fs from 'fs';
import path from 'path';

const DEFAULT_IMAGE_NAME = '200x300';
const DEFAULT_IMAGE_EXTENSION = 'jpg';

export function buildServer() {
  const server = fastify();

  server.get('/', async () => {
    return 'OK';
  });

  server.get('/images/:name', async (req: fastify.FastifyRequest, res) => {
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

    const imagePath = path.join(__dirname, 'assets', imageName);

    // Return 404 if the image path doesn't exist.
    if (!fs.existsSync(imagePath)) {
      return res.status(404).send('Not Found');
    }

    const imageStream = fs.createReadStream(imagePath);

    res.type('image/*');

    return imageStream;
  });

  server.setNotFoundHandler((req, res) => {
    res.status(404).send('Not Found');
  });

  return server;
}
