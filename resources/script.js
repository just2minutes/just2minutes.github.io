document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.querySelector('.menu-toggle');
    const menu = document.querySelector('.menu');

    if (toggle && menu) {
        toggle.addEventListener('click', function(e) {
            menu.classList.toggle('open');
            e.stopPropagation(); // Prevent click from bubbling up
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (menu.classList.contains('open')) {
                if (!menu.contains(e.target) && e.target !== toggle) {
                    menu.classList.remove('open');
                }
            }
        });
    }
});

let lastScroll = 0;
const header = document.querySelector('header');

window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    if (currentScroll > lastScroll && currentScroll > 60) {
        // Scrolling down
        header.classList.add('hide-on-scroll');
    } else {
        // Scrolling up
        header.classList.remove('hide-on-scroll');
    }
    lastScroll = currentScroll <= 0 ? 0 : currentScroll; // For Mobile or negative scrolling
});

/**
 * Fetch the last two videos from a YouTube channel using the YouTube Data API v3.
 * @param {string} apiKey - Your YouTube Data API key.
 * @param {string} channelId - The channel's ID.
 * @returns {Promise<Array>} - Resolves to an array of video objects.
 */
async function getLastTwoVideos(apiKey, channelId) {
    // First, get the last two video IDs
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=2&type=video`;
    try {
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error('Network response was not ok');
        const searchData = await searchResponse.json();
        const videoIds = searchData.items.map(item => item.id.videoId).join(',');

        // Now, get the full details (including full description) for those videos
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=snippet`;
        const videosResponse = await fetch(videosUrl);
        if (!videosResponse.ok) throw new Error('Network response was not ok');
        const videosData = await videosResponse.json();

        return videosData.items.map(item => ({
            videoId: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            publishedAt: item.snippet.publishedAt,
            description: item.snippet.description // This is the full description!
        }));
    } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
    }
}

function renderVideos(videos) {
    const container = document.getElementById('youtube-videos');
    if (!container) return;
    container.innerHTML = videos.map((video, idx) => `
        <div class="youtube-video">
            <h3>${video.title}</h3>
            <div class="youtube-video-iframe-wrap">
                <iframe 
                    src="https://www.youtube.com/embed/${video.videoId}?rel=0"
                    title="${video.title}" 
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
            <button class="desc-toggle" data-target="desc-${idx}">Show Description</button>
            <div class="video-desc" id="desc-${idx}" style="display:none;">
                <p>${linkify(video.description).replace(/\n/g, "<br>")}</p>
            </div>
        </div>
    `).join('');

    // Add toggle functionality
    container.querySelectorAll('.desc-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const desc = container.querySelector(`#${btn.dataset.target}`);
            if (desc.style.display === "none") {
                desc.style.display = "block";
                btn.textContent = "Hide Description";
            } else {
                desc.style.display = "none";
                btn.textContent = "Show Description";
            }
        });
    });
}

/**
 * Fetch all playlists from a YouTube channel using the YouTube Data API v3.
 * @param {string} apiKey - Your YouTube Data API key.
 * @param {string} channelId - The channel's ID.
 * @returns {Promise<Array>} - Resolves to an array of playlist objects.
 */
async function getAllPlaylists(apiKey, channelId) {
    let playlists = [];
    let nextPageToken = '';
    do {
        const apiUrl = `https://www.googleapis.com/youtube/v3/playlists?key=${apiKey}&channelId=${channelId}&part=snippet&maxResults=50&pageToken=${nextPageToken}`;
        const response = await fetch(apiUrl);
        if (!response.ok) break;
        const data = await response.json();
        playlists = playlists.concat(data.items.map(item => ({
            id: item.id,
            title: item.snippet.title
        })));
        nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);
    return playlists;
}

// Helper: Fetch videos from a playlist
async function getPlaylistVideos(apiKey, playlistId) {
    let videos = [];
    let nextPageToken = '';
    do {
        const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${playlistId}&part=snippet&maxResults=50&pageToken=${nextPageToken}`;
        const response = await fetch(apiUrl);
        if (!response.ok) break;
        const data = await response.json();
        videos = videos.concat(data.items.map(item => ({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title
        })));
        nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);

    // Fetch full descriptions in batches of 50
    let fullVideos = [];
    for (let i = 0; i < videos.length; i += 50) {
        const ids = videos.slice(i, i + 50).map(v => v.videoId).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${ids}&part=snippet`;
        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) continue;
        const detailsData = await detailsResponse.json();
        fullVideos = fullVideos.concat(detailsData.items.map(item => ({
            videoId: item.id,
            title: item.snippet.title,
            description: item.snippet.description
        })));
    }
    return fullVideos;
}

// Render playlist buttons and handle click to show videos
function renderPlaylists(playlists) {
    const container = document.getElementById('youtube-playlists');
    if (!container) return;
    container.innerHTML = playlists.map(pl => `
        <button class="playlist-btn" data-playlist-id="${pl.id}" data-title="${pl.title}">
            Show ${pl.title}
        </button>
    `).join('') + `<div id="playlist-videos"></div>`;

    container.querySelectorAll('.playlist-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const playlistId = btn.getAttribute('data-playlist-id');
            const playlistTitle = btn.getAttribute('data-title');
            const isShowing = btn.classList.contains('open');

            // Hide all playlists and reset all buttons
            container.querySelectorAll('.playlist-btn').forEach(b => {
                b.textContent = `Show ${b.getAttribute('data-title')}`;
                b.classList.remove('open');
            });
            document.getElementById('playlist-videos').innerHTML = '';

            if (!isShowing) {
                const videos = await getPlaylistVideos(apiKey, playlistId);
                renderPlaylistVideos(videos, playlistTitle);
                btn.textContent = `Hide ${playlistTitle}`;
                btn.classList.add('open');
            }
        });
    });
}

// Render the videos as iframes
function renderPlaylistVideos(videos, playlistTitle = "") {
    const videoContainer = document.getElementById('playlist-videos');
    if (!videoContainer) return;
    videoContainer.innerHTML = videos.map((video, idx) => `
        <div class="playlist-video">
            <h4>${video.title}</h4>
            <div class="youtube-video-iframe-wrap">
                <iframe
                    src="https://www.youtube.com/embed/${video.videoId}?rel=0"
                    title="${video.title}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
            <button class="desc-toggle" data-target="playlist-desc-${idx}">
                Show Description
            </button>
            <div class="video-desc" id="playlist-desc-${idx}" style="display:none;">
                <p>${linkify(video.description ? video.description : "").replace(/\n/g, "<br>")}</p>
            </div>
        </div>
    `).join('');

    // Add toggle functionality
    videoContainer.querySelectorAll('.desc-toggle').forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            const desc = videoContainer.querySelector(`#${btn.dataset.target}`);
            if (desc.style.display === "none") {
                desc.style.display = "block";
                btn.textContent = "Hide Description";
            } else {
                desc.style.display = "none";
                btn.textContent = "Show Description";
            }
        });
    });
}

// Replace with your channel ID
const apiKey = "AIzaSyBhsDPNQR69v70ZQFxkOvXMOIRgE4pQsls";
const apiKey1 = "AIzaSyDmr4hPqY2vYlWb7WbmC0u5lUE8vqF12Lg";
const channelId = "UCesehqhgaJRI_NLsDCn3TRQ";

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('youtube-videos')) {
        getLastTwoVideos(apiKey, channelId).then(renderVideos);
    }
});

// Only run on gallery page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('youtube-playlists')) {
        getAllPlaylists(apiKey, channelId).then(renderPlaylists);
    }
});

function linkify(text) {
    // Regex to match URLs (http, https, www)
    return text.replace(
        /(\bhttps?:\/\/[^\s<]+[^\s<\.)])|(\bwww\.[^\s<]+[^\s<\.)])/gi,
        function(url) {
            let href = url;
            if (!href.match(/^https?:\/\//)) href = 'http://' + href;
            return `<a href="${href}" target="_blank" rel="noopener">${url}</a>`;
        }
    );
}
