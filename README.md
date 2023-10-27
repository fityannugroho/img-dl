# img-dl

Downloade image(s), by command or programmatically. The alternative for `image-downloader` package (see the [comparison](#comparison)).

[![MIT license](https://img.shields.io/github/license/fityannugroho/img-dl.svg)](https://github.com/fityannugroho/img-dl/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/img-dl.svg)](https://www.npmjs.com/package/img-dl)
[![npm downloads](https://img.shields.io/npm/dm/img-dl.svg)](https://www.npmjs.com/package/img-dl)
[![install size](https://packagephobia.com/badge?p=img-dl)](https://packagephobia.com/result?p=img-dl)


## Prerequisites

- Node.js 18 or later
- npm 9 or later

## Installation

**img-dl** can be installed in the global scope (if you'd like to have it available and use it on the whole system) or locally for a specific package (especially if you'd like to use it programmatically):

Install globally:

```bash
npm install -g img-dl
```

Install locally:

```bash
npm install img-dl
```

## Usage

### Command line

Access the help page with `imgdl --help`

```
Download an image from a URL

USAGE
  $ imgdl <url> ... [OPTIONS]

PARAMETERS
  url   The URL of the image to download. Provide multiple URLs to download multiple images.
        In increment mode, the URL must contain {i} placeholder for the index,
        only one URL is allowed, and the 'end' flag is required.

OPTIONS
  -d, --dir=<path>          The output directory. Default: current working directory
      --end=<number>        The end index. Required in increment mode
  -e, --ext=<ext>           The file extension. Default: original extension or jpg
  -h, --help                Show this help message
  -i, --increment           Enable increment mode. Default: false
  -n, --name=<filename>     The filename. Default: original filename or timestamp
      --max-retry=<number>  Set the maximum number of times to retry the request if it fails
      --silent              Disable logging
      --start=<number>      The start index for increment mode. Default: 0
  -t, --timeout=<number>    Set timeout for each request in milliseconds
  -v, --version             Show the version number

EXAMPLES
  $ imgdl https://example.com/image.jpg
  $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=png
  $ imgdl https://example.com/image.jpg --silent
  $ imgdl https://example.com/image.jpg https://example.com/image2.webp
  $ imgdl https://example.com/image-{i}.jpg --increment --start=1 --end=10
```

#### Simple download

```bash
imgdl https://example.com/image.jpg
```

#### Download multiple images

```bash
imgdl https://example.com/image.jpg https://example.com/image2.jpg
```

#### Download multiple images with increment mode

```bash
imgdl https://example.com/image-{i}.jpg --increment --start=1 --end=10
```

### Programmatically

#### Simple download

```js
import imgdl from 'img-dl';

const image = await imgdl('https://example.com/image.jpg');
console.log(image);
/*
{
  url: 'https://example.com/image.jpg',
  name: 'image',
  extension: 'jpg',
  directory: '/path/to/current/working/directory',
  originalName: 'image',
  originalExtension: 'jpg',
  path: '/path/to/current/working/directory/image.jpg',
}
*/
```

#### Download multiple images

```js
import imgdl from 'img-dl';

const images = await imgdl([
  'https://example.com/image.jpg',
  'https://example.com/image2.jpg',
]);
```

## API

### imgdl(url, ?options)

Download image(s) from the given URL(s).

#### `url`

Type: `string | string[]` <br>
Required: `true`

The URL(s) of the image(s) to download. Required.

#### `options`

Type: [`Options`](https://github.com/fityannugroho/img-dl/blob/main/src/index.ts#L35) <br>
Required: `false`

| Properties | Type | Default | Description |
| --- | --- | --- | --- |
| `directory` | `string` | `process.cwd()` | The output directory |
| `extension` | `string` | jpg | The file extension. If not specified, the original extension will be used. If the original extension is not available, 'jpg' will be used. |
| `name` | `string` | image | The filename. If not specified, the original filename will be used. If the original filename is not available, 'image' will be used. <br>When downloading multiple images, `-index` will be appended to the end of the name (suffix). `index` will start from 1. For example: 'image-1' |
| `maxRetry` | `number` | 2 | Set the maximum number of times to retry the request if it fails.
| `onSuccess` | `(image: Image) => void` | `undefined` | The callback function to be called when the image is successfully downloaded. Only available when downloading multiple images. |
| `onError` | `(error: Error, url: string) => void` | `undefined` | The callback function to be called when the image fails to download. Only available when downloading multiple images. |
| `timeout` | `number` | `undefined` | Set timeout for each request in milliseconds.

## Comparison

| Features | **img-dl** | [image-downloader][p1] |
| --- | :---: | :---: |
| Download single image | ✅ | ✅ |
| Download multiple images | ✅ | ❌ |
| CLI | ✅ | ❌ |
| Increment download | ✅ | ❌ |
| Custom filename | ✅ | ✅ |
| Custom extension | ✅ | ❌ |
| Request timeout | ✅ | ✅ |
| Retry failed request | ✅ | ❌ |

<!-- Project links -->
[p1]: https://www.npmjs.com/package/image-downloader

## Support This Project

Give a ⭐️ if this project helped you!

You can support this project by donating via [GitHub Sponsors](https://github.com/sponsors/fityannugroho), [Trakteer](https://trakteer.id/fityannugroho/tip), or [Saweria](https://saweria.co/fityannugroho).
