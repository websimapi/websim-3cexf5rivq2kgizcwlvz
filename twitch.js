export class TwitchConnector {
    constructor(onConnected, onDisconnected, onJoinCommand) {
        this.onConnected = onConnected;
        this.onDisconnected = onDisconnected;
        this.onJoinCommand = onJoinCommand;
        this.client = null;
    }

    connect(channel) {
        if (this.client) {
            this.client.disconnect();
        }

        this.client = new tmi.Client({
            channels: [channel]
        });

        this.client.on('connected', (address, port) => {
            console.log(`Connected to ${channel}`);
            this.onConnected(channel);
        });

        this.client.on('disconnected', (reason) => {
            console.log(`Disconnected from ${channel}: ${reason}`);
            this.onDisconnected(channel);
        });

        this.client.on('message', (channel, tags, message, self) => {
            if (self) return;

            if (message.toLowerCase() === '!join') {
                this.onJoinCommand(tags);
            }
        });

        this.client.connect().catch(console.error);
    }

    disconnect() {
        if (this.client) {
            this.client.disconnect();
        }
    }
}

