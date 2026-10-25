"""Install a private, read-only Hean dashboard on a connected LingClaw device."""
import argparse,json,os,subprocess,tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--adb',default='adb');p.add_argument('--credentials',type=Path,required=True);p.add_argument('--serial');p.add_argument('--display-only',action='store_true',help=argparse.SUPPRESS);a=p.parse_args()
c=json.loads(a.credentials.read_text());source=Path(__file__).with_name('hean.lua').read_text()
if not c['url'].startswith('https://'):raise ValueError('HTTPS required')
source=source.replace('"__HEAN_DISPLAY_URL__"',json.dumps(c['url'])).replace('"__HEAN_DISPLAY_TOKEN__"',json.dumps(c['token']))
with tempfile.TemporaryDirectory(prefix='hean-display-') as d:
 f=Path(d)/'hean.lua';f.write_text(source);os.chmod(f,0o600)
 subprocess.run([a.adb,*(['-s',a.serial] if a.serial else []),'push',str(f),'/miniapp/hean.lua'],check=True)
