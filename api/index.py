import sys
import os
from pathlib import Path

# Ensure project root and backend directory are always on sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("VERCEL", "1")

from backend.app.main import app
