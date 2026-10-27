# Discord Bot Template

A minimal Discord bot template with OpenAI-compatible API support. Responds to @mentions and dedicated channel messages with conversation memory and rate limiting.

## Prerequisites

- **Node.js 18+**
- **Discord Bot Token** — Create an application at [Discord Developer Portal](https://discord.com/developers/applications), add a Bot, and copy the token
- **OpenAI-compatible API endpoint** — Works with OpenAI, local models (Ollama, LM Studio, etc.), or any OpenAI-compatible API

## Installation

```bash
# Clone or copy this template
git clone <your-repo-url>
cd bot-template

# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your values
```

## Configuration

Edit `.env` with your settings:

```bash
# Required
DISCORD_TOKEN=your_bot_token
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini

# Required for authorization (bot only responds to this user)
DISCORD_OWNER_ID=your_discord_user_id

# Optional
DISCORD_GUILD_ID=your_guild_id          # For instant command registration
DISCORD_CHANNEL_ID=your_channel_id      # Dedicated channel (no @mention needed)
OPENAI_MAX_TOKENS=4096                  # Max response tokens
OPENAI_TEMPERATURE=0.7                  # Sampling temperature
OPENAI_SYSTEM_PROMPT=You are a helpful assistant.
RATE_LIMIT_RPM=30                       # Requests per minute per user (default: 30)
```

### Key Configuration Notes

| Variable | Purpose |
|----------|---------|
| `DISCORD_OWNER_ID` | **Required.** Bot only responds to this user. Enable Developer Mode in Discord (Settings → Advanced), right-click your user → Copy User ID. |
| `DISCORD_CHANNEL_ID` | Optional. If set, bot responds to **all messages** in this channel without @mentions. Threads in this channel also work. |
| `RATE_LIMIT_RPM` | Optional (default: 30). Per-user rate limit. Set higher for more throughput, lower for stricter limits. |

## Running

```bash
# Development (auto-reload)
npm run dev

# Production build + start
npm run build
npm start
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | Yes | — | Bot token from Discord Developer Portal |
| `DISCORD_OWNER_ID` | Yes | — | Your Discord user ID (authorization gate) |
| `DISCORD_GUILD_ID` | No | — | Guild ID for instant slash command registration (not used currently) |
| `DISCORD_CHANNEL_ID` | No | — | Channel ID for dedicated chat (no @mention needed) |
| `OPENAI_BASE_URL` | Yes | — | OpenAI-compatible API endpoint |
| `OPENAI_API_KEY` | Yes | — | API key for the endpoint |
| `OPENAI_MODEL` | Yes | — | Model name (e.g., `gpt-4o`, `gpt-4o-mini`, `llama3`) |
| `OPENAI_MAX_TOKENS` | No | API default | Maximum tokens per response |
| `OPENAI_TEMPERATURE` | No | API default | Sampling temperature (0–2) |
| `OPENAI_SYSTEM_PROMPT` | No | — | System prompt for all conversations |
| `RATE_LIMIT_RPM` | No | `30` | Requests per minute per user |

## Usage

Once running, the bot responds in two ways:

### 1. @Mention (Any Channel)
```
@BotName What's the weather like?
```
Bot replies with streaming response. Mention is stripped before sending to AI.

### 2. Dedicated Channel (No Mention Needed)
If `DISCORD_CHANNEL_ID` is set, **every message** in that channel gets a response — no @mention required. Threads in that channel also work.

### Conversation Memory
The bot maintains **per-user, per-channel conversation history** (up to ~20 messages or token limit). Each conversation is independent.

### Rate Limiting
Each user is limited to `RATE_LIMIT_RPM` requests per minute (default 30). Exceeding returns:
```
⏱️ Rate limited. Try again in 45s.
```

### Owner-Only
Only the user specified in `DISCORD_OWNER_ID` can interact with the bot. All other users are ignored.

## Project Structure

```
src/
├── index.ts              # Entry point, Discord client, message handling
├── config.ts             # Configuration loading & validation
├── openai-session.ts     # OpenAI-compatible streaming chat client
├── conversation-history.ts  # In-memory conversation history (per user/channel)
├── rate-limiter.ts       # Sliding-window per-user rate limiter
```

## Extending

- **Add persistence**: Replace `ConversationHistory` with a database-backed implementation
- **Add commands**: Re-add slash commands in `src/commands/` and register in `index.ts`
- **Modify memory**: Adjust `maxMessages` or `maxTokens` in `conversation-history.ts`
- **Change rate limit algorithm**: Replace `RateLimiter` class in `rate-limiter.ts`

## License

MIT — Use freely for your own projects.