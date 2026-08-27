auth.onAuthStateChanged(function(user) {
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    loadGames();
});

async function loadGames() {
    var container = document.getElementById('games-grid');
    
    try {
        var response = await fetch('data/games.json');
        var games = await response.json();
        
        container.innerHTML = games.map(function(game) {
            var buttonText = game.type === 'luck' ? 'PLAY (' + game.entryCost + ' 🪙)' : 'PLAY FREE';
            var buttonClass = game.type === 'luck' ? 'btn-secondary' : 'btn-primary';
            
            return `
                <a href="games/${game.id}.html" style="text-decoration:none;color:inherit;">
                    <div class="stat-card" style="text-align:center;padding:16px;height:100%;">
                        <div style="font-size:36px;margin-bottom:8px;">${game.icon}</div>
                        <div style="font-weight:600;font-size:14px;">${game.name}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin:4px 0;">${game.category}</div>
                        <button class="btn ${buttonClass} btn-small" style="width:100%;margin-top:8px;">${buttonText}</button>
                    </div>
                </a>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading games:', error);
        container.innerHTML = '<p style="color:var(--text-muted);">Failed to load games</p>';
    }
}

function showMultiplayer() {
    Utils.showToast('🚧 Multiplayer Coming Soon - Realtime battles under development!');
}
