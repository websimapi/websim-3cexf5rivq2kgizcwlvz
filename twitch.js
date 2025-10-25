import tmi from 'tmi.js';

let client;
const JOIN_COMMAND = '!join';
let onUserJoinCallback;

export function setupTwitch(channel, callback) {
    onUserJoinCallback = callback;

    const opts = {
        connection: {
            secure: true,
            reconnect: true
        },
        channels: [channel]
    };

    client = new tmi.client(opts);

    client.on('message', onMessageHandler);
    client.on('connected', onConnectedHandler);
    client.on('disconnected', onDisconnectedHandler);

    client.connect().catch(console.error);
}

function onMessageHandler(target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    const command = msg.trim().toLowerCase();
    
    if (command === JOIN_COMMAND) {
        const username = context['display-name'] || context.username;
        const color = context.color || '#'+(Math.random()*0xFFFFFF<<0).toString(16);
        if(onUserJoinCallback) {
            onUserJoinCallback(username, color);
        }
    }
}

function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    document.getElementById('connection-status').textContent = `Status: Connected to #${client.opts.channels[0]}`;
    document.getElementById('connection-status').style.color = '#4CAF50';
    document.getElementById('connection-panel').classList.add('hidden');
    document.getElementById('race-controls').classList.remove('hidden');
}

function onDisconnectedHandler(reason) {
    console.log(`* Disconnected from chat: ${reason}`);
    document.getElementById('connection-status').textContent = 'Status: Disconnected';
    document.getElementById('connection-status').style.color = '#F44336';
    document.getElementById('connection-panel').classList.remove('hidden');
    document.getElementById('race-controls').classList.add('hidden');
}