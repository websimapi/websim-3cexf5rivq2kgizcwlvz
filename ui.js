export class UI {
    constructor() {
        this.connectBtn = document.getElementById('connect-btn');
        this.startRaceBtn = document.getElementById('start-race-btn');
        this.channelInput = document.getElementById('twitch-channel');
        this.connectionStatus = document.getElementById('connection-status');
        this.leaderboardList = document.getElementById('leaderboard-list');
        this.leaderboard = document.getElementById('leaderboard');
        this.joinMessage = document.getElementById('join-message');
        this.countdownEl = document.getElementById('countdown');
        this.joinList = document.getElementById('join-list');
        this.joinListContainer = document.getElementById('join-list-container');
    }

    onConnected(channel) {
        this.connectionStatus.textContent = `Connected to #${channel}`;
        this.connectionStatus.style.color = '#4caf50';
        this.startRaceBtn.disabled = false;
        this.channelInput.disabled = true;
        this.connectBtn.textContent = 'Disconnect'; // Or change functionality
        this.setGameState('joining');
    }

    onDisconnected(channel) {
        this.connectionStatus.textContent = `Disconnected from #${channel}`;
        this.connectionStatus.style.color = '#f44336';
        this.startRaceBtn.disabled = true;
        this.channelInput.disabled = false;
        this.connectBtn.textContent = 'Connect';
    }

    setGameState(state) {
        if (state === 'joining') {
            this.joinMessage.classList.remove('hidden');
            this.leaderboard.classList.add('hidden');
            this.countdownEl.classList.add('hidden');
            this.startRaceBtn.disabled = false;
            this.joinListContainer.style.display = 'block';
        } else if (state === 'racing') {
            this.joinMessage.classList.add('hidden');
            this.leaderboard.classList.remove('hidden');
            this.startRaceBtn.disabled = true;
            this.joinListContainer.style.display = 'none';
        }
    }

    showCountdown(seconds, callback) {
        this.countdownEl.classList.remove('hidden');
        this.joinMessage.classList.add('hidden');
        let count = seconds;
        this.countdownEl.textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                this.countdownEl.textContent = count;
            } else if (count === 0) {
                this.countdownEl.textContent = "GO!";
            } else {
                clearInterval(interval);
                this.countdownEl.classList.add('hidden');
                callback();
            }
        }, 1000);
    }

    updateLeaderboard(marbles) {
        this.leaderboardList.innerHTML = '';
        marbles.forEach((marble, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${marble.username}`;
            this.leaderboardList.appendChild(li);
        });
    }

    addJoinedPlayer(username) {
        const li = document.createElement('li');
        li.textContent = username;
        this.joinList.appendChild(li);
    }
}

