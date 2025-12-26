# Deploying Nepalify on Ubuntu Server

This guide assumes you have SSH access to your Ubuntu home server.

## Prerequisites
-   **Node.js & npm** installed on the server.

## 1. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 2. Transfer Files
Copy these files to your server (e.g., `~/nepalify`):
-   `server.js`, `package.json`
-   `index.html`, `style.css`, `script.js`

## 3. Install & Run
```bash
cd ~/nepalify
npm install
node server.js
```

## 4. Run Forever (PM2)
```bash
sudo npm install -g pm2
pm2 start server.js --name nepalify
pm2 startup
pm2 save
```
