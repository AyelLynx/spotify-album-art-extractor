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
    
    // Show loading state
    extractBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    try {
        // Handle spotify.link URLs by resolving them first
        let finalUrl = url;
        if (url.includes('spotify.link')) {
            try {
                finalUrl = await resolveSpotifyLink(url);
            } catch (error) {
                showError('Unable to resolve spotify.link URL. Please try copying the link directly from Spotify app or web player.');
                return;
            }
        }
        
        if (!isValidSpotifyUrl(finalUrl)) {
            showError('Please enter a valid Spotify URL (album, track, or playlist). Both open.spotify.com and spotify.link URLs are supported.');
            return;
        }
        
        // Extract Spotify ID and type from URL
        const { id, type } = parseSpotifyUrl(finalUrl);
        
        // Try multiple methods to get album art
        let albumData = null;
        
        // Method 1: Try oEmbed API
        try {
            albumData = await getAlbumArtFromOEmbed(finalUrl);
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

// Resolve spotify.link URLs to open.spotify.com URLs
async function resolveSpotifyLink(shortUrl) {
    try {
        // Use a CORS proxy to follow the redirect
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(proxyUrl + encodeURIComponent(shortUrl), {
            method: 'HEAD',
            redirect: 'follow'
        });
        
        // Try to get the final URL from the response
        const finalUrl = response.url;
        if (finalUrl && finalUrl.includes('open.spotify.com')) {
            return finalUrl.replace(proxyUrl, '').replace(/.*?(https:\/\/open\.spotify\.com.*)/, '$1');
        }
        
        // Alternative method: try to extract from response headers or body
        const textResponse = await fetch(proxyUrl + encodeURIComponent(shortUrl));
        const text = await textResponse.text();
        
        // Look for spotify URL in the response
        const spotifyMatch = text.match(/https:\/\/open\.spotify\.com\/[^"'\s<>]+/);
        if (spotifyMatch) {
            return spotifyMatch[0];
        }
        
        throw new Error('Could not resolve spotify.link URL');
    } catch (error) {
        // Fallback: try a different approach
        throw new Error('Unable to resolve short link. Please use the direct Spotify URL instead.');
    }
}

// Validate Spotify URL
function isValidSpotifyUrl(url) {
    const spotifyUrlRegex = /^https:\/\/(open\.spotify\.com|spotify\.com)\/(album|track|playlist)\/[a-zA-Z0-9]+(\?.*)?$/;
    const spotifyLinkRegex = /^https:\/\/spotify\.link\/[a-zA-Z0-9]+$/;
    return spotifyUrlRegex.test(url) || spotifyLinkRegex.test(url);
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
    
    // Extract image URL from the HTML thumbnail and upgrade to higher resolution
    if (data.thumbnail_url) {
        // Spotify thumbnail URLs often come as 300x300, upgrade to 640x640
        let imageUrl = data.thumbnail_url;
        
        // Try to upgrade image resolution
        imageUrl = upgradeSpotifyImageResolution(imageUrl);
        
        return {
            imageUrl: imageUrl,
            title: data.title || 'Unknown Title',
            artist: extractArtistFromTitle(data.title) || 'Unknown Artist'
        };
    }
    
    throw new Error('No thumbnail found in oEmbed response');
}

// Function to upgrade Spotify image URLs to highest resolution
function upgradeSpotifyImageResolution(imageUrl) {
    if (!imageUrl) return imageUrl;
    
    // Spotify image URLs follow patterns like:
    // https://i.scdn.co/image/ab67616d0000b273[hash] (640x640)
    // https://i.scdn.co/image/ab67616d00001e02[hash] (300x300)
    // https://i.scdn.co/image/ab67616d0000485[hash] (64x64)
    
    // Replace size codes with the highest resolution (640x640)
    const highResPatterns = [
        { from: 'ab67616d00001e02', to: 'ab67616d0000b273' }, // 300x300 -> 640x640
        { from: 'ab67616d00004851', to: 'ab67616d0000b273' }, // 64x64 -> 640x640
        { from: 'ab67616d000048f1', to: 'ab67616d0000b273' }, // 160x160 -> 640x640
    ];
    
    let upgradedUrl = imageUrl;
    highResPatterns.forEach(pattern => {
        upgradedUrl = upgradedUrl.replace(pattern.from, pattern.to);
    });
    
    // Also try removing size parameters if present
    upgradedUrl = upgradedUrl.replace(/[?&]w=\d+/, '').replace(/[?&]h=\d+/, '');
    
    return upgradedUrl;
}

// Function to get the best (highest resolution) image from Spotify's image array
function getBestImageFromArray(images) {
    if (!images || !Array.isArray(images) || images.length === 0) {
        return null;
    }
    
    // Spotify typically provides images in descending size order
    // but let's find the largest one to be sure
    let bestImage = images[0]; // Start with first image
    
    for (const image of images) {
        // Look for 640x640 specifically
        if (image.width === 640 && image.height === 640) {
            return image.url;
        }
        
        // Otherwise, prefer larger images
        if (image.width && image.height) {
            if (!bestImage.width || !bestImage.height || 
                (image.width * image.height > bestImage.width * bestImage.height)) {
                bestImage = image;
            }
        }
    }
    
    return bestImage.url;
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
        // Get the highest resolution image (first in array is usually largest)
        imageUrl = getBestImageFromArray(data.images);
        title = data.name;
        artist = data.artists?.[0]?.name;
    } else if (type === 'track') {
        // Get album art from track data
        imageUrl = getBestImageFromArray(data.album?.images);
        title = data.album?.name;
        artist = data.artists?.[0]?.name;
    } else if (type === 'playlist') {
        imageUrl = getBestImageFromArray(data.images);
        title = data.name;
        artist = `Playlist by ${data.owner?.display_name}`;
    }
    
    if (imageUrl) {
        // Ensure we have the highest resolution
        imageUrl = upgradeSpotifyImageResolution(imageUrl);
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
            // Upgrade the extracted image to highest resolution
            let imageUrl = upgradeSpotifyImageResolution(imageMatch[1]);
            
            return {
                imageUrl: imageUrl,
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
        // Method 1: Try CORS proxy for download
        let downloadUrl = currentImageUrl;
        let blob = null;
        
        try {
            // Try direct fetch first (works locally)
            const response = await fetch(currentImageUrl);
            blob = await response.blob();
        } catch (corsError) {
            console.log('Direct fetch failed, trying CORS proxy...');
            
            // Method 2: Use CORS proxy
            try {
                const proxyUrl = 'https://api.allorigins.win/raw?url=';
                const response = await fetch(proxyUrl + encodeURIComponent(currentImageUrl));
                blob = await response.blob();
            } catch (proxyError) {
                console.log('CORS proxy failed, using canvas method...');
                
                // Method 3: Use canvas to download the displayed image
                const img = document.getElementById('albumArt');
                if (img && img.complete) {
                    blob = await imageToBlob(img);
                } else {
                    throw new Error('No methods available for download');
                }
            }
        }
        
        if (blob) {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Clean filename
            const cleanTitle = currentAlbumTitle.replace(/[<>:"/\\|?*]/g, '');
            const cleanArtist = currentArtistName.replace(/[<>:"/\\|?*]/g, '');
            a.download = `${cleanArtist} - ${cleanTitle}.jpg`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Show success message temporarily
            const downloadBtn = document.querySelector('.download-btn');
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = '✅ Downloaded!';
            downloadBtn.style.background = '#28a745';
            
            setTimeout(() => {
                downloadBtn.textContent = originalText;
                downloadBtn.style.background = '#1DB954';
            }, 2000);
        }
        
    } catch (error) {
        console.error('All download methods failed:', error);
        
        // Fallback: Open image in new tab for manual save
        showDownloadFallback();
    }
}

// Helper function to convert image element to blob using canvas
async function imageToBlob(imgElement) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imgElement.naturalWidth || 640;
        canvas.height = imgElement.naturalHeight || 640;
        
        ctx.drawImage(imgElement, 0, 0);
        
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas to blob conversion failed'));
            }
        }, 'image/jpeg', 0.95);
    });
}

// Show download fallback options
function showDownloadFallback() {
    const fallbackHtml = `
        <div class="download-fallback" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 400px;
            text-align: center;
        ">
            <h3>Download Options</h3>
            <p>Automatic download failed. Choose an option:</p>
            <div style="margin: 1rem 0; display: flex; flex-direction: column; gap: 0.5rem;">
                <button onclick="openImageInNewTab()" style="
                    background: #1DB954;
                    color: white;
                    border: none;
                    padding: 0.75rem;
                    border-radius: 8px;
                    cursor: pointer;
                ">🖼️ Open Image in New Tab</button>
                <button onclick="copyImageUrl()" style="
                    background: #f0f0f0;
                    color: #333;
                    border: 1px solid #ddd;
                    padding: 0.75rem;
                    border-radius: 8px;
                    cursor: pointer;
                ">📋 Copy Image URL</button>
            </div>
            <button onclick="closeFallback()" style="
                background: #ccc;
                color: #666;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
            ">Close</button>
        </div>
        <div class="fallback-overlay" onclick="closeFallback()" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        "></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', fallbackHtml);
}

// Open image in new tab for manual save
function openImageInNewTab() {
    window.open(currentImageUrl, '_blank');
    closeFallback();
}

// Close download fallback
function closeFallback() {
    const fallback = document.querySelector('.download-fallback');
    const overlay = document.querySelector('.fallback-overlay');
    if (fallback) fallback.remove();
    if (overlay) overlay.remove();
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

// Add enter key support for input field and mobile improvements
document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('spotifyUrl');
    const extractBtn = document.getElementById('extractBtn');
    
    // Enter key support
    urlInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            extractAlbumArt();
        }
    });
    
    // Mobile improvements
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Add mobile-specific optimizations
        urlInput.setAttribute('autocomplete', 'off');
        urlInput.setAttribute('autocorrect', 'off');
        urlInput.setAttribute('autocapitalize', 'off');
        urlInput.setAttribute('spellcheck', 'false');
        
        // Prevent zoom on focus for iOS
        urlInput.addEventListener('focus', function() {
            document.querySelector('meta[name=viewport]').setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        });
        
        urlInput.addEventListener('blur', function() {
            document.querySelector('meta[name=viewport]').setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
        });
        
        // Add mobile-friendly paste button
        if (navigator.clipboard) {
            const pasteBtn = document.createElement('button');
            pasteBtn.textContent = '📋 Paste';
            pasteBtn.className = 'paste-btn';
            pasteBtn.style.cssText = `
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: #1DB954;
                color: white;
                border: none;
                padding: 0.5rem;
                border-radius: 6px;
                font-size: 0.8rem;
                cursor: pointer;
                z-index: 10;
            `;
            
            const inputGroup = document.querySelector('.input-group');
            inputGroup.style.position = 'relative';
            inputGroup.appendChild(pasteBtn);
            
            pasteBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                try {
                    const text = await navigator.clipboard.readText();
                    urlInput.value = text;
                    urlInput.focus();
                } catch (err) {
                    console.log('Paste failed:', err);
                }
            });
        }
    }
    
    // Improved error handling for mobile
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        if (event.reason.message && event.reason.message.includes('spotify.link')) {
            showError('Unable to process spotify.link URL. Please try copying the full Spotify URL instead.');
        }
    });
    
    // Add some example URLs for quick testing (remove in production)
    console.log('Example URLs for testing:');
    console.log('Album: https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy');
    console.log('Track: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh');
    console.log('Playlist: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    console.log('Short link: https://spotify.link/Xh5iOW9nWXb');
});