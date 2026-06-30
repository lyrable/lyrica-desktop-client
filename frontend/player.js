console.log("PLAYER JS VERSION 2");
const coverEl = document.getElementById("cover");
const songNameEl = document.getElementById("song-name");
const artistNameEl = document.getElementById("artist-name");
const paletteEl = document.getElementById("palette");
const lyricsEl = document.getElementById("lyrics");
const progressFillEl = document.getElementById("progress-fill");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const audioEl = document.getElementById("audio");
const socket = new WebSocket("ws://localhost:8765");

let lyricLines = [];
socket.onopen = () => {
    console.log("Подключились к Python");
};
socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    console.log("Получено сообщение:", message);
    console.log("Тип:", message.type);

    if (message.type === "track_list") {
        console.log("Ветка track_list");
        console.log(message.data);
        console.log(message.data.tracks);
        allTracks = message.data.tracks;
        renderTrackList(allTracks);
    }

    else if (message.type === "song") {
        console.log("Ветка song");

        setupSong(message.data);

        console.log("После setupSong");

        document.getElementById("library-screen").style.display = "none";
        document.getElementById("player-screen").style.display = "flex";
    }
};

let allTracks = [];
let song = null;
let timedWords = [];

let isPlaying = false;
let pausedTime = 0;

let animationId = null;
let songLength = 0;

function parseBeatId(beatId) {
    const parts = String(beatId).split(".");
    const mainBeat = Number(parts[0]);
    const subBeat = parts[1] ? Number(parts[1]) : 0;

    return mainBeat + subBeat / 4;
}

function beatToSeconds(beatId, bpm, offsetSeconds) {
    const beat = parseBeatId(beatId);
    return offsetSeconds + beat * (60 / bpm);
}

function prepareWords(songData) {
    return songData.words.map((item, index) => ({
        word: item[0].replaceAll("|", ""),
        rawWord: item[0],
        time: beatToSeconds(
            item[1],
            songData.bpm,
            songData.off ?? 0
        ),
        syllables: item[3] ?? [],
        duration: item[2],
        index
    }));
}

function applyTheme(colors) {
    const primary = colors.primary || "#ff0088";
    const secondary = colors.secondary || "#090909";
    const accent = colors.accent || "#ff73d3";

    document.documentElement.style.setProperty("--primary-color", primary);
    document.documentElement.style.setProperty("--secondary-color", secondary);
    document.documentElement.style.setProperty("--accent-color", accent);
    document.documentElement.style.setProperty("--primary-glow", `${primary}88`);

    document.body.style.background = "#090909";
}

function renderPalette(colors) {
    paletteEl.innerHTML = "";

    Object.values(colors).forEach(color => {
        const div = document.createElement("div");

        div.className = "color-block";
        div.style.background = color;

        paletteEl.appendChild(div);
    });
}

function renderLyrics(currentTime) {

    lyricsEl.innerHTML = "";

    let currentLine = 0;

    for (let i = 0; i < lyricLines.length; i++) {

        if (!lyricLines[i] || lyricLines[i].length === 0) {
            continue;
        }

        if (currentTime >= lyricLines[i][0].time) {
            currentLine = i;
        }
    }

    const firstLine = Math.max(0, currentLine - 1);
    const lastLine = Math.min(
        lyricLines.length - 1,
        currentLine + 1
    );

    for (let i = firstLine; i <= lastLine; i++) {

        const line = document.createElement("div");
        line.className = "lyric-line";

        lyricLines[i].forEach((item, index) => {

            const nextWord =
                lyricLines[i][index + 1];

            const nextTime =
                nextWord
                    ? nextWord.time
                    : songLength;

            const span = document.createElement("span");

            span.className = "word";
            span.textContent = item.word;

            if (
                currentTime >= item.time &&
                currentTime < nextTime
            ) {
                span.classList.add("active");
            }
            else if (currentTime >= nextTime) {
                span.classList.add("passed");
            }

            line.appendChild(span);
        });

        lyricsEl.appendChild(line);
    }
}
function getCurrentTime() {
    return audioEl.currentTime || pausedTime;
}

function updateProgress(currentTime) {
    const percent = Math.min(
        (currentTime / songLength) * 100,
        100
    );

    progressFillEl.style.width = `${percent}%`;
}

function animate() {
    const currentTime = getCurrentTime();

    renderLyrics(currentTime);
    updateProgress(currentTime);

    if (currentTime >= songLength) {
        isPlaying = false;
        startBtn.textContent = "Replay";

        cancelAnimationFrame(animationId);
        return;
    }

    animationId = requestAnimationFrame(animate);
}

function setupSong(songData) {
    console.log("songData =", songData);
    console.log("songData.album =", songData.album);

    song = songData;

    console.log("song =", song);
    console.log("song.album =", song.album);

    songNameEl.textContent = song.d.n;
    artistNameEl.textContent = song.d.a;

    if (song.album?.cover_url) {
    coverEl.src = song.album.cover_url;
    }

    applyTheme(song.theme.color_pallete);

    timedWords = prepareWords(song);
    lyricLines = [];

    for (let i = 0; i < song.lines.length; i++) {

        const start = song.lines[i];

        const end =
            i + 1 < song.lines.length
                ? song.lines[i + 1]
                : timedWords.length;

        const line = timedWords.slice(start, end);

        if (line.length > 0) {
            lyricLines.push(line);
        }
    }

    songLength =
        timedWords[timedWords.length - 1].time + 5;

    audioEl.load();
    audioEl.pause();
    audioEl.currentTime = 0;

    renderLyrics(0);
    updateProgress(0);
    document.getElementById("song-content").style.display = "block";
}

function renderTrackList(tracks) {
    const tracksList = document.getElementById("tracks-list");

    tracksList.innerHTML = "";

    tracks.forEach(track => {
        const card = document.createElement("div");

        card.className = "track-card";

        const artist =
            track.artists.length > 0
                ? track.artists.join(", ")
                : "Неизвестный исполнитель";

        const minutes = track.duration
            ? Math.floor(track.duration / 60)
            : "--";

        const seconds = track.duration
            ? Math.floor(track.duration % 60)
                .toString()
                .padStart(2, "0")
            : "--";

        card.innerHTML = `
            <img
                class="track-cover"
                src="${track.cover_url ?? ""}"
                alt="cover"
            >

            <div class="track-info">
                <div class="track-title">
                    ${track.title}
                </div>

                <div class="track-artist">
                    ${artist}
                </div>
            </div>

            <div class="track-duration">
                ${minutes}:${seconds}
            </div>
        `;

        card.addEventListener("click", () => {

            socket.send(JSON.stringify({
                type: "load_song",
                username: document.getElementById("login-username-input").value,
                title: track.title,
                artist: track.artists.length > 0
                    ? track.artists[0]
                    : null
            }));

        });

        tracksList.appendChild(card);
    });
}

const searchInput = document.getElementById("song-search");

searchInput.addEventListener("input", () => {

    const query = searchInput.value.trim().toLowerCase();

    if (query === "") {
        renderTrackList(allTracks);
        return;
    }

    const filtered = allTracks.filter(track => {

        const title = track.title.toLowerCase();

        const artists = track.artists
            .join(" ")
            .toLowerCase();

        return (
            title.includes(query) ||
            artists.includes(query)
        );
    });

    renderTrackList(filtered);

});

resetBtn.addEventListener("click", () => {
    pausedTime = 0;
    isPlaying = false;

    audioEl.pause();
    audioEl.currentTime = 0;

    startBtn.textContent = "Start";

    cancelAnimationFrame(animationId);

    renderLyrics(0);
    updateProgress(0);
});

const registerButton = document.getElementById("register-button");
registerButton.addEventListener("click", async () => {
    const email = document.getElementById("email-input").value;
    const username = document.getElementById("username-input").value;
    const password = document.getElementById("password-input").value;

    const response = await fetch("https://api.lyricapp.ru/accounts/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: email,
            username: username,
            password: password,
        }),
    });

    const data = await response.json();

if (data.status === "ok") {
    console.log("Успешная регистрация!");
    console.log(data);

    localStorage.setItem("user_id", data.userid);

    document.getElementById("register-screen").style.display = "none";
    document.getElementById("library-screen").style.display = "flex";
} else {
    alert("Пользователь с данным ником уже существует. Попробуйте другой.");
}
});

startBtn.addEventListener("click", async () => {
    if (!song) return;

    if (!isPlaying) {
        isPlaying = true;

        audioEl.currentTime = pausedTime;
        startBtn.textContent = "Pause";

        try {
            await audioEl.play();
        } catch (error) {
            console.log("Audio play error:", error);
        }

        animate();
    } else {
        pausedTime = getCurrentTime();

        isPlaying = false;

        audioEl.pause();

        startBtn.textContent = "Continue";

        cancelAnimationFrame(animationId);
    }
});

const loginButton = document.getElementById("login-button");

loginButton.addEventListener("click", () => {
    document.getElementById("register-screen").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
});

const backButton = document.getElementById("back-button");

backButton.addEventListener("click", () => {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("register-screen").style.display = "flex";
});
const loginSubmitButton = document.getElementById("login-submit-button");

loginSubmitButton.addEventListener("click", async () => {
    const username = document.getElementById("login-username-input").value;
    const password = document.getElementById("login-password-input").value;

    const response = await fetch(
        "https://api.lyricapp.ru/accounts/login",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                password: password,
            }),
        }
    );

    const data = await response.json();

    if (data.status === true) {
        localStorage.setItem("user_id", data.id);

        socket.send(JSON.stringify({
            type: "login",
            username: username
        }));

        document.getElementById("login-screen").style.display = "none";
        document.getElementById("library-screen").style.display = "flex";
} else {
        alert("Неверный логин или пароль.");
    }
});

const backToLibraryBtn =
    document.getElementById("back-to-library");

backToLibraryBtn.addEventListener("click", () => {

    audioEl.pause();

    cancelAnimationFrame(animationId);

    isPlaying = false;
    pausedTime = 0;

    startBtn.textContent = "Start";

    document.getElementById("player-screen").style.display = "none";
    document.getElementById("library-screen").style.display = "flex";
});
//loadSong();
