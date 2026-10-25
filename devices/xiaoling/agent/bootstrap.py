"""Fetch the pinned official SDK; generated vendor directories stay out of Git."""
import hashlib, io, pathlib, tarfile, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
URL = 'https://cdn.iflyos.cn/llm/agent-sdk/agent-sdk-0.1.1.tar.gz'
SHA256 = '54873b9658bc16197d11f6a0a71234eda380968faf8b823eb0c418b625fd6be1'
data = urllib.request.urlopen(URL, timeout=30).read()
if hashlib.sha256(data).hexdigest() != SHA256:
    raise RuntimeError('Official SDK checksum changed; inspect before updating')
with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
    for member in archive.getmembers():
        for source, target in [('listenai-voice-chat/src/', 'vendor/'), ('listenai-voice-chat/sdk/', 'sdk/')]:
            if member.isfile() and member.name.startswith(source):
                relative = pathlib.PurePosixPath(member.name[len(source):])
                if relative.is_absolute() or '..' in relative.parts:
                    raise RuntimeError('Unsafe SDK path')
                destination = ROOT / target / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(archive.extractfile(member).read())
print('Official SDK 0.1.1 ready')
config = ROOT / 'config.local.ts'
if not config.exists():
    config.write_text((ROOT / 'config.example.ts').read_text())
