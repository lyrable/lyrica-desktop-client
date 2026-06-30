import asyncio
import anyascii
import re
from pathlib import Path
from config import PASSWORD
from linux import get_media_info
import requests

AUDIO_DIR = Path(__file__).parent / "audio"


async def get_song(username, title, artist):
    slug = slugify(f"{artist}_{title}")

    if slug.startswith("vanna_krasnyy_pol"):
        audio_path = AUDIO_DIR / "vanna_krasnyy_pol.mp3"
        if audio_path.exists():
            return {
                "data": {
                    "n": title,
                    "a": artist or "Vanna",
                },
                "audio_url": "/audio/vanna_krasnyy_pol.mp3",
                "words": [],
                "lines": [],
                "bpm": 120,
                "theme": {
                    "color_pallete": {
                        "primary": "#ff0088",
                        "secondary": "#090909",
                        "accent": "#ff73d3"
                    }
                }
            }

    url = "https://api.lyricapp.ru/tracks/get"
    payload = create_payload(
        username=username,
        slug=slug,
        title=title,
        artist=artist
    )

    response = requests.post(url, json=payload)
    if response.status_code != 200:
        return None

    response_json = response.json()
    song = response_json["data"]
    song["album"] = response_json.get("album")

    return song

def slugify(text: str):
    normalized = anyascii.anyascii(text)
    normalized = normalized.lower()
    normalized = re.sub(r"\s+", "_", normalized)
    normalized = re.sub(r"[^a-z0-9_]", "", normalized)
    return normalized.strip("_")

def create_payload(
    username: str,
    slug: str,
    title: str,
    artist: str | None
) -> dict:
    return {
        "username": username,
        "password": PASSWORD,
        "slug": slug,
        "title": title,
        "artist": artist
    }


def get_track_list(username: str, page: int = 1) -> dict | None:
    url = "https://api.lyricapp.ru/tracks/list"

    payload = {
        "username": username,
        "password": PASSWORD,
        "page": page,
    }

    response = requests.post(url, json=payload)

    if response.status_code != 200:
        return None

    return response.json()

if __name__ == "__main__":
    asyncio.run(get_song("yneskk"))
