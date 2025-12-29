# Quick Setup Guide 🚀

## First Time Setup (5 minutes)

### 1. Install Node.js
- Download from [nodejs.org](https://nodejs.org)
- Choose LTS version (Long Term Support)
- Verify installation: `node --version` (should show v14 or higher)

### 2. Get the Code
```bash
git clone https://github.com/KyleMcCalgan/Blackjack
cd Blackjack
npm install
```

### 3. Set Up Ngrok (for playing with friends online)

#### Create Free Ngrok Account
1. Go to [ngrok.com](https://ngrok.com) and sign up
2. After login, go to **Your Authtoken** page
3. Copy the authtoken (long string like `2abc...xyz123`)

#### Add Authtoken to Project
1. Create a `.env` file:
   - **Mac/Linux**: `cp .env.example .env`
   - **Windows CMD**: `copy .env.example .env`
   - **Windows PowerShell**: `Copy-Item .env.example .env`

2. Open `.env` and paste your token:
   ```
   NGROK_AUTHTOKEN=paste_your_actual_token_here
   ```
   **Important**: No quotes, no spaces around the =

### 4. Start Playing!
```bash
npm run dev
```

Look for these lines in the terminal:
```
========================================
🎰 Blackjack Game Server Started!
========================================
Local URL: http://localhost:3000
Starting ngrok tunnel...
========================================
🌍 Public URL (share this with friends):
👉 https://abc123.ngrok-free.app
========================================
```

**Share the ngrok URL** (https://...) with friends!

---

## Every Time You Want to Play

1. Open terminal in project folder
2. Run `npm run dev`
3. Share the new ngrok URL with players
4. Keep terminal window open while playing

**Note**: The ngrok URL changes each time you restart. Just share the new one!

---

## Common Issues

### "NGROK_AUTHTOKEN not found"
- Check that `.env` file exists (not `.env.example`)
- Verify token is on the line: `NGROK_AUTHTOKEN=yourtoken`
- No quotes around the token
- Restart server after editing `.env`

### "Port 3000 already in use"
- Close other programs using port 3000
- Or change PORT in `server/index.js`

### Players can't connect
- Share the **https://** ngrok URL, not localhost
- Make sure server is still running
- URL changes every restart - share the new one

---

## Local Play Only (No Internet)

If you just want to play on your local network:

1. Start server with `npm run dev`
2. Find your computer's IP:
   - **Windows**: Run `ipconfig`, look for IPv4 Address
   - **Mac**: Run `ifconfig`, look for inet address
   - **Linux**: Run `ip addr`
3. Players connect to: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

**Note**: All players must be on the same WiFi network.

---

## Need Help?

- Check the full [README.md](README.md) for detailed information
- Ngrok docs: [ngrok.com/docs](https://ngrok.com/docs)
- Report issues: [GitHub Issues](https://github.com/KyleMcCalgan/Blackjack/issues)
