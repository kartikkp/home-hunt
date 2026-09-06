"""Create a server-only household secret once; never print or publish it."""
import os
import secrets
from pathlib import Path

root = Path(__file__).resolve().parent
target = root / '.env'
if not target.exists():
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write('HOUSEHOLD_TOKEN=' + secrets.token_urlsafe(32) + '\n')
os.chmod(target, 0o600)
(root / 'backups').mkdir(exist_ok=True, mode=0o700)
print('Household secret ready; existing secret preserved.')
