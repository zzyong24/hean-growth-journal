"""Create ignored deployment configuration; never put account secrets in source."""
import argparse, json, pathlib, re
from urllib.parse import urlsplit

p = argparse.ArgumentParser()
p.add_argument('--product-id', required=True)
p.add_argument('--origin', required=True, help='Your Hean HTTPS origin, without a path')
a = p.parse_args()
if not re.fullmatch(r'[A-Za-z0-9-]{8,100}', a.product_id):
    p.error('Invalid ListenAI product ID')
origin = a.origin.rstrip('/')
url = urlsplit(origin)
if url.scheme != 'https' or not url.hostname or url.username or url.password or url.path or url.query or url.fragment:
    p.error('Use an HTTPS origin without credentials, path, query or fragment')
root = pathlib.Path(__file__).resolve().parent
(root/'listenai.toml').write_text((root/'listenai.example.toml').read_text().replace('YOUR_LISTENAI_PRODUCT_ID', a.product_id))
(root/'config.local.ts').write_text('export const musicOrigin = '+json.dumps(origin)+';\n')
print('Local product and music origin configured. Both generated files are ignored by Git.')
