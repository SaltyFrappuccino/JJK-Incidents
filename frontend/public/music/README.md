# Music Files

This directory contains audio files for the music player.

## Adding Music Files

1. Place your audio files (MP3, WAV, OGG, etc.) in this directory
2. Update `playlist.json` to include your tracks:

```json
[
  {
    "id": "track_1",
    "title": "Your Song Title",
    "artist": "Artist Name", 
    "file": "/music/your-song.mp3"
  }
]
```

## Supported Formats

- MP3
- WAV
- OGG
- M4A
- Any format supported by HTML5 Audio

## Example Files

The playlist.json currently references these example tracks:
- jjk_main_theme.mp3
- battle_theme.mp3  
- suspense.mp3

Replace these with your actual audio files or update the playlist.json accordingly.
