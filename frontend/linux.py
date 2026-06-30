import subprocess
from typing import Optional, Dict


async def get_media_info() -> Optional[Dict[str, str]]:
    try:
        metadata = subprocess.run(
            [
                "playerctl",
                "metadata",
                "--format",
                "{{artist}}|{{title}}",
            ],
            capture_output=True,
            text=True,
        )

        if metadata.returncode != 0:
            return None

        line = metadata.stdout.strip()

        if "|" not in line:
            return None

        artist, title = line.split("|", 1)

        status = subprocess.run(
            [
                "playerctl",
                "status",
            ],
            capture_output=True,
            text=True,
        )

        if status.returncode != 0:
            return None

        playback_status = status.stdout.strip()

        return {
            "title": title.strip(),
            "artist": artist.strip(),
            "playback_status": playback_status,
        }

    except Exception:
        return None