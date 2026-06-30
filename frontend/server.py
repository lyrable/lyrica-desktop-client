import asyncio
import json
from pathlib import Path
from websockets import serve
from aiohttp import web
from track_provider import get_song, get_track_list

AUDIO_DIR = Path(__file__).parent / "audio"


async def ws_handler(websocket):
    async for message in websocket:
        data = json.loads(message)

        if data["type"] == "login":
            username = data["username"]
            tracks = get_track_list(username)
            if tracks is not None:
                await websocket.send(json.dumps({
                    "type": "track_list",
                    "data": tracks
                }))
        elif data["type"] == "load_song":
            username = data["username"]
            title = data["title"]
            artist = data["artist"]
            song = await get_song(username=username, title=title, artist=artist)
            if song is not None:
                await websocket.send(json.dumps({
                    "type": "song",
                    "data": song
                }))


async def audio_handler(request):
    filename = request.match_info["filename"]
    file_path = AUDIO_DIR / filename
    if file_path.exists():
        return web.FileResponse(file_path)
    return web.Response(status=404)


async def run_websocket():
    async with serve(ws_handler, "localhost", 8765):
        await asyncio.Future()


async def run_http():
    app = web.Application()
    app.router.add_get("/audio/{filename}", audio_handler)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "localhost", 8080)
    await site.start()
    await asyncio.Future()


async def main():
    await asyncio.gather(run_websocket(), run_http())


if __name__ == "__main__":
    asyncio.run(main())