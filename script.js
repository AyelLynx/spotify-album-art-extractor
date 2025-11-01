// Global variables to store current album data
let currentImageUrl = '';
let currentAlbumTitle = '';
let currentArtistName = '';

// Main function to extract album art
async function extractAlbumArt() {
    const urlInput = document.getElementById('spotifyUrl');
    const extractBtn = document.getElementById('extractBtn');
    const btnText = extractBtn.querySelector('.btn-text');
    const spinner = extractBtn.querySelector('.loading-spinner');
    const resultSection = document.getElementById('resultSection');
    const errorSection = document.getElementById('errorSection');
    
    const url = urlInput.value.trim();
    
    // Validate URL
    if (!url) {
        showError('Please enter a Spotify URL');
        return;
    }
    
    if (!isValidSpotifyUrl(url)) {
        showError('Please enter a valid Spotify URL (album, track, or playlist)');
        return;
    }
    
    // Show loading state
    extractBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    try {
        // Extract Spotify ID and type from URL
        const { id, type } = parseSpotifyUrl(url);
        
        // Try multiple methods to get album art
        let albumData = null;
        
        // Method 1: Try oEmbed API
        try {
            albumData = await getAlbumArtFromOEmbed(url);
        } catch (error) {
            console.log('oEmbed failed:', error.message);
        }
        
        // Method 2: Try direct Spotify Web API (requires CORS proxy)
        if (!albumData) {
            try {
                albumData = await getAlbumArtFromWebAPI(id, type);
            } catch (error) {
                console.log('Web API failed:', error.message);
            }
        }
        
        // Method 3: Try Spotify embed scraping
        if (!albumData) {
            try {
                albumData = await getAlbumArtFromEmbed(id, type);
            } catch (error) {
                console.log('Embed scraping failed:', error.message);
            }
        }
        
        if (albumData) {
            displayAlbumArt(albumData);
        } else {
            showError('Unable to extract album artwork. Please try a different URL or check if the content is publicly available.');
        }
        
    } catch (error) {
        console.error('Error extracting album art:', error);
        showError('An error occurred while extracting album artwork. Please try again.');
    } finally {
        // Reset button state
        extractBtn.disabled = false;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }
}

// Validate Spotify URL
function isValidSpotifyUrl(url) {
    const spotifyUrlRegex = /^https:\/\/(open\.spotify\.com|spotify\.com)\/(album|track|playlist)\/[a-zA-Z0-9]+(\?.*)?$/;
    return spotifyUrlRegex.test(url);
}

// Parse Spotify URL to extract ID and type
function parseSpotifyUrl(url) {
    const regex = /https:\/\/(open\.)?spotify\.com\/(album|track|playlist)\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    
    if (!match) {
        throw new Error('Invalid Spotify URL format');
    }
    
    return {
        type: match[2],
        id: match[3]
    };
}

// Method 1: Get album art using Spotify oEmbed API
async function getAlbumArtFromOEmbed(url) {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(oembedUrl);
    if (!response.ok) {
        throw new Error(`oEmbed API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract image URL from the HTML thumbnail
    if (data.thumbnail_url) {
        return {
            imageUrl: data.thumbnail_url,
            title: data.title || 'Unknown Title',
            artist: extractArtistFromTitle(data.title) || 'Unknown Artist'
        };
    }
    
    throw new Error('No thumbnail found in oEmbed response');
}

// Method 2: Get album art using Spotify Web API (through CORS proxy)
async function getAlbumArtFromWebAPI(id, type) {
    // Using a public CORS proxy - in production, you'd want your own backend
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    let apiUrl = '';
    
    if (type === 'album') {
        apiUrl = `https://api.spotify.com/v1/albums/${id}`;
    } else if (type === 'track') {
        apiUrl = `https://api.spotify.com/v1/tracks/${id}`;
    } else if (type === 'playlist') {
        apiUrl = `https://api.spotify.com/v1/playlists/${id}`;
    }
    
    const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
    if (!response.ok) {
        throw new Error(`Web API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    let imageUrl, title, artist;
    
    if (type === 'album') {
        imageUrl = data.images?.[0]?.url;
        title = data.name;
        artist = data.artists?.[0]?.name;
    } else if (type === 'track') {
        imageUrl = data.album?.images?.[0]?.url;
        title = data.album?.name;
        artist = data.artists?.[0]?.name;
    } else if (type === 'playlist') {
        imageUrl = data.images?.[0]?.url;
        title = data.name;
        artist = `Playlist by ${data.owner?.display_name}`;
    }
    
    if (imageUrl) {
        return { imageUrl, title, artist };
    }
    
    throw new Error('No image found in Web API response');
}

// Method 3: Get album art by scraping Spotify embed
async function getAlbumArtFromEmbed(id, type) {
    // This method tries to extract image from the embed iframe
    // Note: This might not work due to CORS restrictions
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
    
    try {
        const response = await fetch(embedUrl);
        if (!response.ok) {
            throw new Error(`Embed fetch failed: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Try to extract image URL from meta tags or other sources
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        
        if (imageMatch) {
            return {
                imageUrl: imageMatch[1],
                title: titleMatch ? titleMatch[1] : 'Unknown Title',
                artist: 'Unknown Artist'
            };
        }
        
        throw new Error('No image found in embed HTML');
    } catch (error) {
        throw new Error('Embed scraping failed due to CORS restrictions');
    }
}

// Helper function to extract artist from title string
function extractArtistFromTitle(title) {
    if (!title) return null;
    
    // Common patterns: "Artist - Title", "Title by Artist", etc.
    const patterns = [
        /^(.+?)\s*-\s*.+$/,  // "Artist - Title"
        /^.+?\s+by\s+(.+)$/i, // "Title by Artist"
        /^(.+?)\s*·\s*.+$/    // "Artist · Title"
    ];
    
    for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    
    return null;
}

// Display the extracted album art
function displayAlbumArt(albumData) {
    const resultSection = document.getElementById('resultSection');
    const errorSection = document.getElementById('errorSection');
    const albumArt = document.getElementById('albumArt');
    const albumTitle = document.getElementById('albumTitle');
    const artistName = document.getElementById('artistName');
    
    // Store current data globally
    currentImageUrl = albumData.imageUrl;
    currentAlbumTitle = albumData.title;
    currentArtistName = albumData.artist;
    
    // Update UI
    albumArt.src = albumData.imageUrl;
    albumArt.alt = `${albumData.title} by ${albumData.artist}`;
    albumTitle.textContent = albumData.title;
    artistName.textContent = albumData.artist;
    
    // Show result section
    errorSection.style.display = 'none';
    resultSection.style.display = 'block';
}

// Show error message
function showError(message) {
    const resultSection = document.getElementById('resultSection');
    const errorSection = document.getElementById('errorSection');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    resultSection.style.display = 'none';
    errorSection.style.display = 'block';
}

// Download the album art image
async function downloadImage() {
    if (!currentImageUrl) {
        showError('No image to download');
        return;
    }
    
    try {
        const response = await fetch(currentImageUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAlbumTitle} - ${currentArtistName}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download failed:', error);
        showError('Failed to download image. You can right-click the image and save it manually.');
    }
}

// Copy image URL to clipboard
async function copyImageUrl() {
    if (!currentImageUrl) {
        showError('No image URL to copy');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(currentImageUrl);
        
        // Show temporary success message
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.background = '#1DB954';
        copyBtn.style.color = 'white';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#f0f0f0';
            copyBtn.style.color = '#333';
        }, 2000);
        
    } catch (error) {
        console.error('Copy failed:', error);
        showError('Failed to copy URL to clipboard');
    }
}

// Add enter key support for input field
document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('spotifyUrl');
    
    urlInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            extractAlbumArt();
        }
    });
    
    // Add some example URLs for quick testing (remove in production)
    console.log('Example URLs for testing:');
    console.log('Album: https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy');
    console.log('Track: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh');
    console.log('Playlist: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
});