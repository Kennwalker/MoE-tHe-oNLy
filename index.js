const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
} = require('@whiskeysockets/baileys');

const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const prefix = '.';

const ownerNumber = ['12136061765'];

//===================SESSION-AUTH============================
if (!fs.existsSync(__dirname + '/auth_info_baileys/creds.json')) {
    if (!config.SESSION_ID) return console.log('Please add your session to SESSION_ID env !!');
    const sessdata = config.SESSION_ID;
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
    filer.download((err, data) => {
        if (err) throw err;
        fs.writeFile(__dirname + '/auth_info_baileys/creds.json', data, () => {
            console.log('Session downloaded ✅');
        });
    });
}

const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

//=============================================

async function connectToWA() {
    console.log("Connecting MoE-tHe-oNLy 🤖...");
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys/');
    var { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true, // QR Code itaonyeshwa kwenye terminal
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: true,
        auth: state,
        version,
    });

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Scan the QR Code below to connect:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode || DisconnectReason.loggedOut;
            if (reason !== DisconnectReason.loggedOut) {
                console.log('Reconnecting...');
                connectToWA();
            } else {
                console.log('Logged out. Please restart the bot.');
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connected to WhatsApp!');
            const path = require('path');
            fs.readdirSync("./plugins/").forEach((plugin) => {
                if (path.extname(plugin).toLowerCase() == ".js") {
                    require("./plugins/" + plugin);
                }
            });
            console.log('Plugins installed successfully ✅');
            console.log('Bot is now ready!');

            let up = `Moe-tHe-oNLy connected successfully ✅\n\nPREFIX: ${prefix}`;
            conn.sendMessage(ownerNumber + "@s.whatsapp.net", { 
                image: { url: `https://telegra.ph/file/900435c6d3157c98c3c88.jpg` }, 
                caption: up,
            });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;
        mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
            ? mek.message.ephemeralMessage.message 
            : mek.message;
        if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const body = type === 'conversation'
            ? mek.message.conversation
            : type === 'extendedTextMessage'
                ? mek.message.extendedTextMessage.text
                : '';

        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const reply = (teks) => conn.sendMessage(mek.key.remoteJid, { text: teks }, { quoted: mek });

        if (isCmd) {
            console.log(`Executing command: ${command}`);
            reply(`Command received: ${command}`);
        }
    });
}

app.get("/", (req, res) => {
    res.send("Hey, Moe-tHe-oNLy started ✅");
});
app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));
setTimeout(() => {
    connectToWA();
}, 4000);
