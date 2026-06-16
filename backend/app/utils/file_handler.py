import os
import tempfile
from pathlib import Path

TEMP_DIR = Path(tempfile.gettempdir()) / "hireme_uploads"
TEMP_DIR.mkdir(exist_ok=True)


def save_temp_file(filename: str, content: bytes) -> Path:
    filepath = TEMP_DIR / f"{os.urandom(8).hex()}_{filename}"
    filepath.write_bytes(content)
    return filepath


def remove_temp_file(filepath: Path):
    if filepath.exists():
        filepath.unlink()
