export function updatePlayerList(players) {
    const playerListEl = document.getElementById('player-list');
    const playerCountEl = document.getElementById('player-count');
    
    playerListEl.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player;
        playerListEl.appendChild(li);
    });
    playerCountEl.textContent = players.length;
}

export function updateLeaderboard(marbles) {
    const leaderboardListEl = document.getElementById('leaderboard-list');
    
    // Sort marbles by their progress (using z position for this simple track)
    const sortedMarbles = [...marbles].sort((a, b) => b.body.position.z - a.body.position.z);
    
    leaderboardListEl.innerHTML = '';
    sortedMarbles.slice(0, 10).forEach((marble, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${marble.username}`;
        leaderboardListEl.appendChild(li);
    });
}

export function setConnectionStatus(status) {
    document.getElementById('connection-status').textContent = `Status: ${status}`;
}

export function showRaceControls() {
    document.getElementById('connection-panel').classList.add('hidden');
    document.getElementById('race-controls').classList.remove('hidden');
}

export function resetUI() {
    updatePlayerList([]);
    document.getElementById('leaderboard-list').innerHTML = '';
    document.getElementById('leaderboard').classList.add('hidden');
    document.getElementById('start-race-btn').disabled = false;
    document.getElementById('timer').style.display = 'block';
    document.getElementById('timer').textContent = `Race starts in: 15s`;
}

