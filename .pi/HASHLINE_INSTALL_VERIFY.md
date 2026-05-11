# pi-hashline-edit Installation Verification

## Installation Status: ✅ COMPLETE

The `pi-hashline-edit` extension has been successfully installed to the project.

## Installation Details

- **Location**: `/Users/agent/pi-mono/.pi/npm/node_modules/pi-hashline-edit`
- **Version**: 0.4.1
- **Scope**: Project-local (installed with `-l` flag)
- **Registration**: Confirmed in `.pi/settings.json`

## What This Extension Does

Replaces Pi's built-in `read` and `edit` tools with hash-anchored versions:

### Read Tool
Text files are returned with `LINE#HASH:` prefixes on every line:
```
1#ZP:function hello() {
2#MQ:  console.log("world");
3#VR:}
```

- **LINE**: 1-indexed line number
- **HASH**: 2-character content hash from alphabet `ZPMQVRWSNKTXJBYH`
- Images (JPEG, PNG, GIF, WebP) pass through as attachments
- Binary/directory paths rejected with descriptive errors

### Edit Tool
Edits reference the `LINE#HASH` anchors to prevent stale context:
```json
{
  "path": "src/main.ts",
  "edits": [
    { "op": "replace", "pos": "2#MQ", "lines": ["  console.log('hashline');"] }
  ]
}
```

If a hash doesn't match, the edit is rejected before touching the file.

## Verification Steps

The extension will be active in **new Pi sessions** started in `/Users/agent/pi-mono`.

### Manual Test

1. Start a new Pi session in this directory:
   ```bash
   cd /Users/agent/pi-mono
   pi
   ```

2. Enable debug mode (optional):
   ```bash
   PI_HASHLINE_DEBUG=1 pi
   ```
   You should see: "Hashline Edit mode active" notification

3. In the Pi session, read any text file:
   ```
   Read the file package.json
   ```

4. Verify the output shows `LINE#HASH:` prefixes like:
   ```
   1#AB:{
   2#CD:  "name": "@mariozechner/pi-mono",
   3#EF:  "version": "0.13.5",
   ...
   ```

### What to Look For

✅ **Success indicators**:
- Every line has `LINE#HASH:` prefix
- Line numbers are 1-indexed
- Hashes are 2 characters from alphabet `ZPMQVRWSNKTXJBYH`
- Images still render as attachments
- Binary files show helpful error messages

❌ **If prefixes don't appear**:
- Check `.pi/settings.json` contains `"npm:pi-hashline-edit"`
- Run `pi list` to verify extension is registered
- Try `PI_HASHLINE_DEBUG=1 pi` to see if extension loads

## Package Information

- **Repository**: https://github.com/RimuruW/pi-hashline-edit
- **Author**: RimuruW
- **License**: MIT
- **Inspired by**: [oh-my-pi](https://github.com/can1357/oh-my-pi) by can1357

## Uninstall (if needed)

```bash
cd /Users/agent/pi-mono
pi uninstall npm:pi-hashline-edit -l
```
