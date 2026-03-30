# Pi Sendblue Extension

Add iMessage/SMS to any Pi fork in 60 seconds via the Sendblue API.

## Quick Start

1. Clone into Pi extensions directory:

```bash
git clone https://github.com/gbharg/pi-sendblue ~/.pi/extensions/sendblue
```

2. Configure API keys:

```bash
cd ~/.pi/extensions/sendblue
cp .env.example .env
# Edit .env with your keys from https://sendblue.co/dashboard
```

3. Set up webhook (pick one):

```bash
# Tailscale Funnel
tailscale funnel 3001

# Or ngrok
ngrok http 3001
```

Register the public URL at Sendblue Dashboard > Webhooks > endpoint: `/webhook`

4. Start Pi -- extension auto-loads:

```bash
pi
```

Send a text to your Sendblue number. Pi responds.

## Tools

| Tool | Description |
|------|-------------|
| `sendblue_reply` | Send iMessage/SMS to a phone number |
| `sendblue_react` | Send tapback reaction (love/like/laugh/emphasize/question) |
| `sendblue_history` | Fetch recent message history |
| `sendblue_mark_read` | Send read receipt |
| `sendblue_typing` | Show typing indicator |

## Configuration (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDBLUE_API_KEY_ID` | Yes | Sendblue API key ID |
| `SENDBLUE_API_SECRET_KEY` | Yes | Sendblue API secret |
| `SENDBLUE_OWN_NUMBER` | Yes | Your Sendblue phone number (E.164) |
| `ALLOWED_NUMBERS` | No | Comma-separated allowlist (empty = allow all) |
| `WEBHOOK_PORT` | No | Webhook listen port (default: 3001) |
| `SENDBLUE_DATA_DIR` | No | Directory for message logs (default: extension dir) |

## How It Works

The extension runs an HTTP server inside Pi process. Sendblue delivers
inbound messages via webhook, which are injected into Pi session via
`sendUserMessage()`. Pi responds using the registered tools.

No external dependencies. No build step. No npm install.

## License

MIT
