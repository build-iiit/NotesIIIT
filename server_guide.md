# Server Restoration Guide

So you restarted your laptop? No problem. Here is how to get `iiitnotes.online` back online.

## 1. Open Terminal
Navigate to your project directory:
```bash
cd /home/somesh/Documents/NotesIIIT
```

## 2. Start the Website (PM2)
Your website process likely stopped when the laptop turned off.
Run this command to start it again:

```bash
pm2 start npm --name "notes-platform" -- start
```

### Save for Next Time (Optional)
To make sure it starts automatically next time you reboot:
```bash
pm2 save
pm2 startup
```
*(Copy the command `pm2 startup` gives you and run it)*

## 3. Check the Tunnel (Cloudflare)
The tunnel usually restarts itself automatically. Check its status:

```bash
sudo systemctl status cloudflared
```
- If it says **active (running)**: You are good to go!
- If it says **inactive** or **failed**:
  ```bash
  sudo systemctl start cloudflared
  ```

## 4. Verify
Go to [https://iiitnotes.online](https://iiitnotes.online) to confirm it's working.

## Summary of Commands
Quick copy-paste block to restore everything:

```bash
cd /home/somesh/Documents/NotesIIIT
pm2 delete notes-platform 2>/dev/null || true
pm2 start npm --name "notes-platform" -- start
pm2 save
sudo systemctl restart cloudflared
```
