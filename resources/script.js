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
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=2&type=video`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            publishedAt: item.snippet.publishedAt
        }));
    } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
    }
}

function renderVideos(videos) {
    const container = document.getElementById('youtube-videos');
    if (!container) return;
    container.innerHTML = videos.map(video => `
        <div class="youtube-video">
            <p>${video.title}</p>
            <iframe 
                width="360" height="203"
                src="https://www.youtube.com/embed/${video.videoId}rel=0&modestbranding=1&showinfo=0&autoplay=1"
                title="${video.title}" 
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        </div>
    `).join('');
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

function renderPlaylists(playlists) {
    const container = document.getElementById('youtube-playlists');
    if (!container) return;
    container.innerHTML = playlists.map(pl => `
        <a class="playlist-btn" href="https://www.youtube.com/playlist?list=${pl.id}" target="_blank">
            ${pl.title}
        </a>
    `).join('');
}

// Replace with your channel ID
const apiKey = "AIzaSyBhsDPNQR69v70ZQFxkOvXMOIRgE4pQsls";
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