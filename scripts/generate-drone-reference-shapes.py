#!/usr/bin/env python3
"""Bake anatomy-preserving drone formations from transparent animal artwork."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


DEFAULT_DRONE_COUNT = 384
DEFAULT_GROUP_RATIOS = (0.48, 0.28)
GROUP_RATIOS = {
    "bald-eagle": (0.48, 0.30),
    "barred-owl": (0.40, 0.42),
    "beaver": (0.48, 0.24),
    "great-blue-heron": (0.58, 0.18),
    "spirit-bear": (0.48, 0.24),
    "western-sandpiper": (0.58, 0.18),
}
LANDMARK_REGIONS = {
    # cx, cy, rx, ry, reserved structure points
    "barred-owl": (0.22, 0.0, 0.25, 0.25, 48),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--assets",
        type=Path,
        default=Path("assets/drone-show"),
        help="Folder containing transparent PNG silhouette references.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("drone-reference-shapes.js"),
        help="JavaScript file to generate.",
    )
    parser.add_argument("--count", type=int, default=DEFAULT_DRONE_COUNT)
    parser.add_argument(
        "--preserve",
        default="",
        help="Comma-separated animal ids to retain from an existing output file.",
    )
    return parser.parse_args()


def stable_seed(label: str) -> int:
    return int.from_bytes(hashlib.sha256(label.encode("utf-8")).digest()[:8], "big")


def flood_exterior(shape_mask: np.ndarray) -> np.ndarray:
    height, width = shape_mask.shape
    exterior = np.zeros_like(shape_mask, dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        if not shape_mask[0, x]:
            queue.append((0, x))
        if not shape_mask[height - 1, x]:
            queue.append((height - 1, x))
    for y in range(height):
        if not shape_mask[y, 0]:
            queue.append((y, 0))
        if not shape_mask[y, width - 1]:
            queue.append((y, width - 1))

    while queue:
        y, x = queue.popleft()
        if exterior[y, x] or shape_mask[y, x]:
            continue
        exterior[y, x] = True
        if y:
            queue.append((y - 1, x))
        if y + 1 < height:
            queue.append((y + 1, x))
        if x:
            queue.append((y, x - 1))
        if x + 1 < width:
            queue.append((y, x + 1))

    return exterior


def remove_small_components(mask: np.ndarray, minimum_area: int) -> np.ndarray:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    cleaned = np.zeros_like(mask, dtype=bool)

    for start_y, start_x in np.argwhere(mask):
        if visited[start_y, start_x]:
            continue

        component: list[tuple[int, int]] = []
        queue: deque[tuple[int, int]] = deque([(int(start_y), int(start_x))])
        visited[start_y, start_x] = True

        while queue:
            y, x = queue.popleft()
            component.append((y, x))
            for next_y in range(max(0, y - 1), min(height, y + 2)):
                for next_x in range(max(0, x - 1), min(width, x + 2)):
                    if (
                        not visited[next_y, next_x]
                        and mask[next_y, next_x]
                    ):
                        visited[next_y, next_x] = True
                        queue.append((next_y, next_x))

        if len(component) >= minimum_area:
            ys, xs = zip(*component)
            cleaned[np.asarray(ys), np.asarray(xs)] = True

    return cleaned


def expanded(mask: np.ndarray, radius: int) -> np.ndarray:
    size = radius * 2 + 1
    image = Image.fromarray(mask.astype(np.uint8) * 255, mode="L")
    return np.asarray(image.filter(ImageFilter.MaxFilter(size=size))) > 0


def contracted(mask: np.ndarray, radius: int) -> np.ndarray:
    size = radius * 2 + 1
    image = Image.fromarray(mask.astype(np.uint8) * 255, mode="L")
    return np.asarray(image.filter(ImageFilter.MinFilter(size=size))) > 0


def farthest_sample(
    mask: np.ndarray,
    count: int,
    seed: int,
    priority_points: list[tuple[int, int]] | None = None,
) -> list[tuple[int, int]]:
    coordinates = np.argwhere(mask)
    if not len(coordinates) or count <= 0:
        return []

    rng = np.random.default_rng(seed)
    pool_limit = max(24000, count * 120)
    if len(coordinates) > pool_limit:
        pool_indices = rng.choice(len(coordinates), size=pool_limit, replace=False)
        coordinates = coordinates[pool_indices]

    if priority_points:
        coordinates = np.vstack(
            [coordinates, np.asarray(priority_points, dtype=np.int32)]
        )

    coordinates = np.unique(coordinates, axis=0)
    target_count = min(count, len(coordinates))
    chosen: list[int] = []
    min_distance = np.full(len(coordinates), np.inf)

    if priority_points:
        for point in priority_points:
            point_array = np.asarray(point)
            index = int(np.argmin(np.sum((coordinates - point_array) ** 2, axis=1)))
            if index not in chosen:
                chosen.append(index)

    if not chosen:
        chosen.append(int(rng.integers(0, len(coordinates))))

    for index in chosen:
        delta = coordinates - coordinates[index]
        min_distance = np.minimum(min_distance, np.sum(delta * delta, axis=1))
        min_distance[index] = -1

    while len(chosen) < target_count:
        next_index = int(np.argmax(min_distance))
        chosen.append(next_index)
        delta = coordinates - coordinates[next_index]
        min_distance = np.minimum(min_distance, np.sum(delta * delta, axis=1))
        min_distance[chosen] = -1

    return [(int(coordinates[index, 0]), int(coordinates[index, 1])) for index in chosen]


def normalized_point(
    point: tuple[int, int],
    bounds: tuple[int, int, int, int],
) -> tuple[float, float]:
    y, x = point
    left, top, right, bottom = bounds
    width = right - left + 1
    height = bottom - top + 1
    scale = max(width, height) / 2
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    return (
        (x - center_x) / (scale * 1.055),
        (y - center_y) / (scale * 1.055),
    )


def texture_value(x: float, y: float, seed: int) -> float:
    wave = math.sin(x * 18.173 + y * 31.719 + seed * 0.000001)
    return wave - math.floor(wave)


def palette_index(
    animal_id: str,
    x: float,
    y: float,
    group: str,
    seed: int,
) -> int:
    texture = texture_value(x, y, seed)

    if animal_id == "bald-eagle":
        in_head = ((x - 0.08) / 0.2) ** 2 + ((y - 0.08) / 0.17) ** 2 < 1
        in_tail = ((x + 0.3) / 0.25) ** 2 + ((y - 0.38) / 0.18) ** 2 < 1
        in_beak = ((x - 0.22) / 0.09) ** 2 + ((y - 0.11) / 0.08) ** 2 < 1
        if in_beak:
            return 4
        if in_head or in_tail:
            return 0 if texture > 0.2 else 1
        return 2 if texture > 0.62 else 3

    if animal_id == "barred-owl":
        in_face = ((x - 0.22) / 0.25) ** 2 + (y / 0.25) ** 2 < 1
        if group == "structure" and in_face:
            return 3 if texture > 0.3 else 1
        bars = int((y + 1) * 9 + abs(x) * 4) % 3
        return (0, 2, 1)[bars] if texture > 0.22 else 2

    if animal_id == "beaver":
        if group == "feature":
            return 3
        if x < -0.5:
            return 2
        if x > 0.38 and y < 0.16:
            return 0
        return 1 if texture > 0.28 else 2

    if animal_id == "great-blue-heron":
        if x > 0.17 and y < -0.58:
            return 4
        if x > 0.18 and y < 0.02:
            return 3
        if y < -0.08:
            return 0 if texture > 0.25 else 1
        return 2 if texture > 0.32 else 1

    if animal_id == "rufous-hummingbird":
        if group == "feature" or x > 0.58:
            return 4
        if x < -0.1:
            return 3 if texture > 0.3 else 2
        if y > 0.03:
            return 0
        return 1 if texture > 0.28 else 0

    if animal_id == "spirit-bear":
        if group == "feature":
            return 3 if x < -0.35 else 2
        if y > 0.2:
            return 1
        return 0 if texture > 0.25 else 2

    if animal_id == "stellers-jay":
        if group == "feature":
            return 3
        if x > 0.14 and y < 0.06:
            return 0
        if x < -0.34 or y > 0.22:
            return 2 if texture > 0.38 else 1
        return 1

    if animal_id == "western-sandpiper":
        if group == "feature" or x > 0.62:
            return 4
        if y > 0.16:
            return 3
        if y < -0.08:
            return 1 if texture > 0.4 else 0
        return 2 if texture > 0.52 else 1

    return 0


def extreme_points(mask: np.ndarray) -> list[tuple[int, int]]:
    coords = np.argwhere(mask)
    if not len(coords):
        return []
    return [
        tuple(coords[np.argmin(coords[:, 1])]),
        tuple(coords[np.argmax(coords[:, 1])]),
        tuple(coords[np.argmin(coords[:, 0])]),
        tuple(coords[np.argmax(coords[:, 0])]),
    ]


def radial_extreme_points(
    mask: np.ndarray,
    sector_count: int = 28,
) -> list[tuple[int, int]]:
    """Keep narrow anatomical tips represented before farthest-point sampling."""
    coords = np.argwhere(mask)
    if not len(coords):
        return []

    center = coords.mean(axis=0)
    offsets = coords - center
    angles = np.arctan2(offsets[:, 0], offsets[:, 1])
    radii = np.sum(offsets * offsets, axis=1)
    sectors = np.floor((angles + math.pi) / (2 * math.pi) * sector_count).astype(int)
    sectors = np.clip(sectors, 0, sector_count - 1)
    anchors: list[tuple[int, int]] = []

    for sector in range(sector_count):
        indices = np.flatnonzero(sectors == sector)
        if len(indices):
            index = int(indices[np.argmax(radii[indices])])
            anchors.append((int(coords[index, 0]), int(coords[index, 1])))

    return anchors


def ellipse_region(
    mask: np.ndarray,
    bounds: tuple[int, int, int, int],
    cx: float,
    cy: float,
    rx: float,
    ry: float,
) -> np.ndarray:
    left, top, right, bottom = bounds
    scale = max(right - left + 1, bottom - top + 1) / 2
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    pixel_cx = center_x + cx * scale * 1.055
    pixel_cy = center_y + cy * scale * 1.055
    pixel_rx = max(1, rx * scale * 1.055)
    pixel_ry = max(1, ry * scale * 1.055)
    ys, xs = np.ogrid[:mask.shape[0], :mask.shape[1]]
    ellipse = (
        ((xs - pixel_cx) / pixel_rx) ** 2
        + ((ys - pixel_cy) / pixel_ry) ** 2
    ) <= 1
    return mask & ellipse


def bake_shape(path: Path, count: int) -> list[list[float | int]]:
    rgba = np.asarray(Image.open(path).convert("RGBA"))
    alpha = rgba[:, :, 3]
    shape_mask = remove_small_components(alpha > 40, minimum_area=12)

    coords = np.argwhere(shape_mask)
    if not len(coords):
        raise ValueError(f"{path} has no visible pixels")
    top, left = coords.min(axis=0)
    bottom, right = coords.max(axis=0)
    bounds = (int(left), int(top), int(right), int(bottom))

    exterior = flood_exterior(shape_mask)
    holes = remove_small_components(~shape_mask & ~exterior, minimum_area=10)
    edge_mask = shape_mask & expanded(~shape_mask, 2)
    outer_mask = edge_mask & expanded(exterior, 2)
    structure_mask = edge_mask & expanded(holes, 2) & ~expanded(outer_mask, 1)
    fill_mask = contracted(shape_mask, 3) & ~expanded(edge_mask, 3)

    outline_ratio, structure_ratio = GROUP_RATIOS.get(
        path.stem,
        DEFAULT_GROUP_RATIOS,
    )
    outline_count = round(count * outline_ratio)
    structure_count = round(count * structure_ratio)
    fill_count = count - outline_count - structure_count
    seed = stable_seed(path.stem)

    outline_anchors = extreme_points(outer_mask) + radial_extreme_points(outer_mask)
    outline = farthest_sample(
        outer_mask,
        outline_count,
        seed + 11,
        outline_anchors,
    )
    landmark_points: list[tuple[int, int]] = []
    landmark_config = LANDMARK_REGIONS.get(path.stem)
    if landmark_config:
        cx, cy, rx, ry, landmark_count = landmark_config
        landmark_mask = ellipse_region(edge_mask, bounds, cx, cy, rx, ry)
        landmark_points = farthest_sample(
            landmark_mask,
            min(landmark_count, structure_count),
            seed + 23,
        )
    structure = farthest_sample(
        structure_mask,
        structure_count,
        seed + 29,
        landmark_points,
    )
    fill = farthest_sample(fill_mask, fill_count, seed + 47)

    groups = [
        ("outline", outline, 0.0, 0.99, 1.04),
        ("fill", fill, 0.4, 0.82, 0.84),
        ("structure", structure, 0.68, 0.94, 0.82),
    ]
    output: list[list[float | int]] = []

    for group, points, detail, opacity, size in groups:
        for point in points:
            x, y = normalized_point(point, bounds)
            output.append(
                [
                    round(x, 4),
                    round(y, 4),
                    palette_index(path.stem, x, y, group, seed),
                    opacity,
                    size,
                    detail,
                ]
            )

    if len(output) < count:
        extra_mask = shape_mask.copy()
        for y, x in outline + structure + fill:
            extra_mask[
                max(0, y - 2):min(extra_mask.shape[0], y + 3),
                max(0, x - 2):min(extra_mask.shape[1], x + 3),
            ] = False
        extra = farthest_sample(
            extra_mask,
            count - len(output),
            seed + 71,
        )
        for point in extra:
            x, y = normalized_point(point, bounds)
            output.append(
                [
                    round(x, 4),
                    round(y, 4),
                    palette_index(path.stem, x, y, "fill", seed),
                    0.82,
                    0.84,
                    0.4,
                ]
            )

    return output[:count]


def load_existing_shapes(path: Path) -> dict[str, list[list[float | int]]]:
    if not path.exists():
        return {}
    source = path.read_text(encoding="utf-8")
    marker = "const DRONE_SHOW_REFERENCE_SHAPES = "
    start = source.find(marker)
    if start < 0:
        return {}
    payload = source[start + len(marker):].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def main() -> None:
    args = parse_args()
    preserve_ids = {
        animal_id.strip()
        for animal_id in args.preserve.split(",")
        if animal_id.strip()
    }
    existing_shapes = load_existing_shapes(args.output) if preserve_ids else {}
    shapes = {
        path.stem: (
            existing_shapes[path.stem]
            if path.stem in preserve_ids and path.stem in existing_shapes
            else bake_shape(path, args.count)
        )
        for path in sorted(args.assets.glob("*.png"))
    }
    payload = json.dumps(shapes, separators=(",", ":"))
    args.output.write_text(
        "// Generated by scripts/generate-drone-reference-shapes.py.\n"
        f"const DRONE_SHOW_REFERENCE_SHAPES = {payload};\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
