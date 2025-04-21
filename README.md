## Pastly

Clipboard manager synced across devices via local network

![app screenshot](./screenshots/1.png)

### Installation

[Check latest release](https://github.com/shixinhuang99/pastly/releases)

### Features

- Supports macOS, Windows and Linux
  > For Linux, only tested on Ubuntu (X11) and only built as a deb package
- Supports text, images, and files
  > Files not supported on Linux, but copied file paths are recorded as text
- Syncs across devices via local network(for example, under the same Wi-Fi network), with automatic device discovery and connection, can be enabled or disabled at any time
  > Allows multiple devices, only syncs text and images
- Supports device pairing via PIN code
- Encrypts synced clipboard content using keys generated from the PIN
- Supports auto-start and system tray
- Supports light mode and dark mode
- Supports multiple languages
  > Currently only supports English and Simplified Chinese
- Supports filtering by keyword and date

### Note

Since it involves networking, the first time the server is started, it will request network permissions.

### Other screenshots

- Tray on macOS

![tray screenshot](./screenshots//2.png)

### Development

requirements:

- rust stable
- node 22
- pnpm

run:

```sh
pnpm i
cargo build
node --run run
```
