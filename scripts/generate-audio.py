"""Generate simple CC0-equivalent synth SFX for the game (stdlib only).

Usage: python scripts/generate-audio.py
Writes click.wav, buy.wav and prestige.wav to public/audio/.
"""
import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "audio"


def tone(freq: float, duration: float, volume: float = 0.5, decay: float = 12.0) -> list[float]:
    """A sine tone with exponential decay envelope."""
    n = int(SAMPLE_RATE * duration)
    return [
        volume * math.exp(-decay * t / n) * math.sin(2 * math.pi * freq * t / SAMPLE_RATE)
        for t in range(n)
    ]


def silence(duration: float) -> list[float]:
    return [0.0] * int(SAMPLE_RATE * duration)


def write_wav(name: str, samples: list[float]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        frames = b"".join(
            struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples
        )
        wav.writeframes(frames)
    print(f"wrote {path} ({path.stat().st_size} bytes)")


# click: short crisp tick
click = tone(880, 0.06, volume=0.4, decay=10)

# buy: two ascending notes (C5 -> G5)
buy = tone(523.25, 0.09, volume=0.45, decay=6) + tone(783.99, 0.13, volume=0.45, decay=6)

# prestige: little fanfare arpeggio (C5 E5 G5 C6, last note rings out)
prestige = (
    tone(523.25, 0.12, volume=0.5, decay=4)
    + tone(659.25, 0.12, volume=0.5, decay=4)
    + tone(783.99, 0.12, volume=0.5, decay=4)
    + tone(1046.5, 0.45, volume=0.55, decay=5)
)

write_wav("click.wav", click)
write_wav("buy.wav", buy)
write_wav("prestige.wav", prestige)
