# streamdl
A simple file downloader using NodeJS streams

## Requirements

- Node.js installed

Check if installed:
```bash
node -v
```

### Basic usage

```bash
node downloader.js <url>
```

Example:

```bash
node downloader.js https://example.com/file.zip
```

### With custom filename

```bash
node downloader.js <url> <output-filename>
```

Example:

```bash
node downloader.js https://example.com/file.zip myfile.zip
```

## Features
* Downloads files from URL
* Live progress bar
* Download speed tracking
* Supports redirects
* Memory efficient streaming