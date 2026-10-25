"""Render synthetic dashboard pages and verify the cache with the official simulator."""
import argparse
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--simulator', required=True, help='Path to the official lingclaw-sdk executable')
    parser.add_argument('--output', type=Path, required=True, help='Directory for synthetic PNG previews')
    args = parser.parse_args()
    simulator = shutil.which(args.simulator)
    if not simulator:
        parser.error('Simulator executable not found')
    root = Path(__file__).resolve().parent
    source = (root / 'hean.lua').read_text(encoding='utf-8')
    if '__HEAN_DISPLAY_TOKEN__' not in source:
        parser.error('Use the public source template, not a paired device file')
    fixture = (root / 'tests' / 'preview.lua').read_text(encoding='utf-8')
    args.output.mkdir(parents=True, exist_ok=True)
    output = args.output.resolve()
    with tempfile.TemporaryDirectory(prefix='hean-preview-') as directory:
        script = Path(directory) / 'preview.lua'
        for page in range(1, 6):
            script.write_text(source + f'\npreview_page={page}\n' + fixture, encoding='utf-8')
            subprocess.run([simulator, '--headless', str(script), str(output / f'page-{page}.png')], check=True)
        script.write_text(source + '\n' + (root / 'tests' / 'cache.lua').read_text(encoding='utf-8'), encoding='utf-8')
        subprocess.run([simulator, '--headless', str(script), str(output / 'cache-test.png')], check=True)
    print(f'Five synthetic previews and cache verification completed: {output}')


if __name__ == '__main__':
    main()
