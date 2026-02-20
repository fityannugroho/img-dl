---
name: img-dl
description: Download single or multiple images at once from URL(s)
license: https://github.com/fityannugroho/img-dl/blob/main/LICENSE
---

# Image Downloader (img-dl)

## When to use

Use this tool when you need to download images from URLs. It is particularly useful for automating the retrieval of images for datasets, web scraping, or content aggregation. It supports both single and bulk downloads, with options for customizing filenames, handling request timeouts, and retrying failed downloads.

## Features

- Single and bulk downloads
- Command-line interface (CLI)
- Customizable filenames and extensions
- Request timeout and retry mechanisms
- Abort ongoing requests
- Increment mode for downloading sequences of images
- Overwrite prevention to avoid file conflicts

### Increment mode

- Download images with an url that contains `{i}` placeholder for the index, and specify the start and end index.

### Overwrite prevention

- To prevent overwriting, ` (n)` will be appended to the name of the new file if the file with the same name already exists.
- The number will be incremented until the file name is unique in the directory, starting from 1 (e.g. `image (1).jpg`, `image (2).jpg`, etc.).
- Image with different extension will be considered as **different** file, so it will not be appended with ` (n)`. For example, `image.jpg` and `image.png` will not be considered as the same file.
- This feature will work for both single and bulk download.

## How to use

- It is recommended to run `imgdl --help` first every time to see the latest usage information.
- Usage examples:
  - Single download - `imgdl https://example.com/image.jpg`
  - Bulk download - `imgdl https://example.com/image.jpg https://example.com/image2.jpg`
  - Increment download - `imgdl https://example.com/image-{i}.jpg --increment --start=1 --end=10`
  - Download from file - `imgdl /path/to/urls.(txt|csv|json)`
- Read the [documentation](https://github.com/fityannugroho/img-dl/blob/main/README.md) for more details.

### File formats for bulk download

- Read [the reference guide](references/REFERENCE.md) for file format details.
- For CSV, you don't need to include all columns. Only the `url` column is required. The other columns are optional.

## Outputs and logs

- Downloaded images will be saved in the destination directory (default: current directory).
- For single download, any success/error messages will be printed directly to the console.
- For bulk download, a summary of successes and failures will be displayed after the operation completes. Error details for failed requests will be logged to `error.log` in the destination directory.

## Tips and best practices

- You may need to check the server connectivity first to avoid unnecessary failed requests, especially before running increment downloads.
- When using increment mode, it's recommended to specify the filename using `--name` option, especially when the URL does not contain a clear filename.
- For large bulk downloads, consider using file-based input to manage URLs more effectively instead of listing them all in the arguments.
- Monitor the `error.log` file after bulk downloads to identify and address any issues with specific URLs.

## Requirements

`img-dl` package must be installed in your environment. Install it globally with `npm` (or user-preferred package manager):

```bash
npm install -g img-dl
```

Alternatively, run it directly with `npx` (or user-preferred package manager runner):

```bash
npx img-dl https://example.com/image.jpg
```

## API

The `img-dl` tool is also available as a Node.js module that can be imported and used programmatically. For more information on using the API, refer to the [documentation](https://github.com/fityannugroho/img-dl/blob/main/README.md).
