# 🎵 Spotify Album Art Extractor

A simple, elegant web application that extracts high-quality album artwork from Spotify links. Perfect for music lovers who want to save album covers, create playlists visuals, or use artwork for other creative projects.

![Spotify Album Art Extractor Screenshot](https://via.placeholder.com/800x400/1DB954/ffffff?text=Spotify+Album+Art+Extractor)

## ✨ Features

- **🎯 Simple Interface**: Clean, intuitive design inspired by Spotify's aesthetic
- **🔗 Multiple URL Support**: Works with album, track, and playlist URLs
- **📱 Responsive Design**: Looks great on desktop, tablet, and mobile devices
- **⬇️ Download Options**: Download full-size images or copy image URLs
- **🚀 Fast & Reliable**: Uses multiple extraction methods for best results
- **🆓 Free & Open Source**: No API keys required, completely client-side

## 🎮 Live Demo

Visit the live demo: [Your GitHub Pages URL will go here]

## 🚀 Quick Start

### Option 1: Use the Live Version
Simply visit the live demo link above and start extracting album art immediately!

### Option 2: Run Locally
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/spotify-album-art-extractor.git
   ```

2. Navigate to the project directory:
   ```bash
   cd spotify-album-art-extractor
   ```

3. Open `index.html` in your web browser or serve it using a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Or simply double-click index.html
   ```

## 📖 How to Use

1. **Copy a Spotify Link**: Go to Spotify (web or app) and copy the share link for any:
   - Album
   - Track/Song
   - Playlist

2. **Paste the Link**: Paste the URL into the input field on the website

3. **Extract Artwork**: Click the "Extract Art" button

4. **Download or Copy**: Once the artwork appears, you can:
   - Download the full-size image
   - Copy the image URL to your clipboard

### Supported URL Formats

The extractor works with these Spotify URL formats:

```
https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy
https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
```

## 🛠️ Technical Details

### How It Works

The application uses a multi-layered approach to extract album artwork:

1. **Spotify oEmbed API**: Primary method for getting artwork
2. **Web API via CORS Proxy**: Fallback method for detailed metadata
3. **Embed Scraping**: Last resort for difficult cases

### Technologies Used

- **HTML5**: Semantic structure and accessibility
- **CSS3**: Modern styling with Flexbox and CSS Grid
- **Vanilla JavaScript**: No frameworks, pure JS for maximum compatibility
- **Spotify oEmbed API**: Official Spotify embedding service

### Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 🎨 Customization

### Styling
The CSS is organized into clear sections. You can easily customize:
- Colors (update the CSS variables)
- Fonts (change the Google Fonts import)
- Layout (modify the flexbox/grid styles)

### Functionality
The JavaScript is modular and well-commented. Key functions:
- `extractAlbumArt()`: Main extraction logic
- `getAlbumArtFromOEmbed()`: Primary extraction method
- `downloadImage()`: Handle image downloads
- `copyImageUrl()`: Clipboard functionality

## 🚀 Deployment

### GitHub Pages (Recommended)

1. Fork this repository
2. Go to your repository settings
3. Scroll down to "Pages" section
4. Select "Deploy from a branch"
5. Choose "main" branch and "/ (root)" folder
6. Your site will be available at: `https://yourusername.github.io/spotify-album-art-extractor`

### Other Platforms

This is a static site that can be deployed anywhere:
- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repository
- **Firebase Hosting**: Use Firebase CLI
- **Any static hosting service**

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue with details about the problem
2. **Suggest Features**: Share your ideas for improvements
3. **Submit Pull Requests**: Fix bugs or add new features

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m "Add feature-name"`
6. Push: `git push origin feature-name`
7. Open a Pull Request

## ⚠️ Limitations

- **Spotify Content Policy**: Only works with publicly available content
- **Rate Limiting**: Spotify may rate limit requests if used excessively
- **CORS Restrictions**: Some extraction methods may be limited by browser security
- **Image Quality**: Dependent on what Spotify provides (usually 640x640px)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Spotify**: For providing the oEmbed API and making this possible
- **Inter Font**: Beautiful typography by Rasmus Andersson
- **Music Community**: For inspiring this tool

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/spotify-album-art-extractor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/spotify-album-art-extractor/discussions)

---

Made with ❤️ for music lovers everywhere

**Note**: This tool is not affiliated with Spotify. It uses publicly available APIs and follows Spotify's terms of service.