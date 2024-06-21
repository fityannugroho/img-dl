# img-dl

Downloade image(s), by command or programmatically. The alternative for `image-downloader` package (see the [features](#features)).

[![MIT license](https://img.shields.io/github/license/fityannugroho/img-dl.svg)](https://github.com/fityannugroho/img-dl/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/img-dl.svg)](https://www.npmjs.com/package/img-dl)
[![npm downloads](https://img.shields.io/npm/dm/img-dl.svg)](https://www.npmjs.com/package/img-dl)
[![install size](https://packagephobia.com/badge?p=img-dl)](https://packagephobia.com/result?p=img-dl)

## Features

| Features                    | **img-dl** | [image-downloader][p1] |
| --------------------------- | :--------: | :--------------------: |
| Single download             |     ✅     |           ✅           |
| Bulk download               |     ✅     |           ❌           |
| CLI                         |     ✅     |           ❌           |
| Custom filename             |     ✅     |           ✅           |
| Custom extension            |     ✅     |           ❌           |
| Request timeout             |     ✅     |           ✅           |
| Retry failed request        |     ✅     |           ❌           |
| Abort request               |     ✅     |           ❌           |
| **Increment mode (in CLI)** |     ✅     |           ❌           |
| **Overwrite prevention**    |     ✅     |           ❌           |

### Increment mode

Download images with an url that contains `{i}` placeholder for the index, and specify the start and end index.

### Overwrite prevention

To prevent overwriting, ` (n)` will be appended to the name of the new file if the file with the same name already exists.

The number will be incremented until the file name is unique in the directory, starting from 1 (e.g. `image (1).jpg`, `image (2).jpg`, etc.).

Image with different extension will be considered as **different** file, so it will not be appended with ` (n)`. For example, `image.jpg` and `image.png` will not be considered as the same file.

> This feature will work for both single and bulk download.

## Prerequisites

- Node.js 20 or later
- npm 10 or later

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
Download image(s), by command or programmatically

USAGE
  $ imgdl <url> ... [OPTIONS]

PARAMETERS
  url   The URL of the image to download. Provide multiple URLs to download multiple images.
        In increment mode, the URL must contain {i} placeholder for the index,
        only one URL is allowed, and the '--end' is required.

OPTIONS
  -d, --dir=<path>          The output directory. Default: current working directory
      --end=<number>        The end index. Required in increment mode
  -e, --ext=<ext>           The file extension. Default: original extension or jpg
  -h, --help                Show this help message
  -H, --header=<header>     The header to send with the request. Can be used multiple times
  -i, --increment           Enable increment mode. Default: false
      --interval=<number>   The interval between each batch of requests in milliseconds
  -n, --name=<filename>     The filename. If not specified, the original filename will be used. Default: 'image'
      --max-retry=<number>  Set the maximum number of times to retry the request if it fails
      --silent              Disable logging
      --start=<number>      The start index for increment mode. Default: 0
      --step=<number>       The number of requests to make at the same time. Default: 5
  -t, --timeout=<number>    Set timeout for each request in milliseconds
  -v, --version             Show the version number

EXAMPLES
  $ imgdl https://example.com/image.jpg
  $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=png
  $ imgdl https://example.com/image.jpg --silent
  $ imgdl https://example.com/image.jpg https://example.com/image2.webp
  $ imgdl https://example.com/image-{i}.jpg --increment --start=1 --end=10
  $ imgdl https://example.com/image.jpg --header="User-Agent: Mozilla/5.0" --header="Cookie: foo=bar"
```

#### Simple download

```bash
imgdl https://example.com/image.jpg
```

#### Bulk download

```bash
imgdl https://example.com/image.jpg https://example.com/image2.jpg
```

#### Bulk download with increment mode

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

#### Bulk download

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

##### `directory`

Type: `string`<br>
Default: `process.cwd()`

The output directory.

##### `extension`

Type: `string`<br>
Default: `'jpg'`

The file extension. If not specified, the original extension will be used. If the original extension is not available, 'jpg' will be used.

##### `headers`

Type: `Record<string, string | string[] | undefined>`<br>
Default: `undefined`

The headers to send with the request.

##### `interval`

Type: `number`<br>
Default: `100`

The interval between each batch of requests in milliseconds when downloading multiple images.

##### `name`

Type: `string`<br>
Default: `'image'`

The filename. If not specified, the original filename will be used. If the original filename is not available, 'image' will be used.

##### `maxRetry`

Type: `number`<br>
Default: `2`

Set the maximum number of times to retry the request if it fails.

##### `onSuccess`

Type: `(image: Image) => void`<br>
Default: `undefined`

The callback function to be called when the image is successfully downloaded. Only available when downloading multiple images.

##### `onError`

Type: `(error: Error, url: string) => void`<br>
Default: `undefined`

The callback function to be called when the image fails to download. Only available when downloading multiple images.

##### `signal`

Type: `AbortSignal`<br>
Default: `undefined`

The signal to abort the request.

##### `step`

Type: `number`<br>
Default: `5`

The number of requests to make at the same time when downloading multiple images.

##### `timeout`

Type: `number`<br>
Default: `undefined`

Set timeout for each request in milliseconds.

<!-- Project links -->

[p1]: https://www.npmjs.com/package/image-downloader

## Support This Project

Give a ⭐️ if this project helped you!

Also please consider supporting this project with a **donation**. Your donation will help us maintain and develop this project and provide you with better support.
