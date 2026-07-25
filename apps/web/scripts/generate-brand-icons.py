"""Generate the static PWA icon set from the current Masraf brand mark."""

from pathlib import Path

from PIL import Image, ImageDraw


NAVY = "#08111f"
PURPLE = "#7567d4"
NORMAL_SIZES = (16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512)
MASKABLE_SIZES = (192, 384, 512)
SUPERSAMPLE = 8


def scaled_polygon(points: tuple[tuple[float, float], ...], box: tuple[int, int, int, int]):
    left, top, width, height = box
    return [(left + x * width, top + y * height) for x, y in points]


def render_icon(size: int, *, maskable: bool = False) -> Image.Image:
    render_size = size * SUPERSAMPLE
    image = Image.new("RGB", (render_size, render_size), NAVY)
    draw = ImageDraw.Draw(image)

    padding_ratio = 0.24 if maskable else 0.18
    padding = round(render_size * padding_ratio)
    box_size = render_size - padding * 2
    mark_box = (padding, padding, box_size, box_size)

    left_bar = ((0.02, 0.0), (0.27, 0.26), (0.27, 1.0), (0.0, 1.0), (0.0, 0.02))
    center_bar = ((0.35, 0.57), (0.61, 0.34), (0.61, 1.0), (0.35, 1.0))
    right_bar = ((0.73, 0.26), (0.98, 0.0), (1.0, 0.02), (1.0, 1.0), (0.73, 1.0))

    for polygon in (left_bar, center_bar, right_bar):
        draw.polygon(scaled_polygon(polygon, mark_box), fill=PURPLE)

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    icon_dir = Path(__file__).resolve().parents[1] / "public" / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)

    for size in NORMAL_SIZES:
        render_icon(size).save(icon_dir / f"icon-{size}.png", optimize=True)

    for size in MASKABLE_SIZES:
        render_icon(size, maskable=True).save(
            icon_dir / f"icon-maskable-{size}.png", optimize=True
        )


if __name__ == "__main__":
    main()
