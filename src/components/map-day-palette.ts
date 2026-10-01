import type { Map as LibreMap } from "maplibre-gl";
type PaintProperty = Parameters<LibreMap["setPaintProperty"]>[1];
/** Recolour the existing basemap without replacing the style or its transit layers. */
export function createDayPalette() {
  const original = new Map<
    string,
    {
      id: string;
      property: PaintProperty;
      value: Parameters<LibreMap["setPaintProperty"]>[2];
    }
  >();
  return (map: LibreMap, day: boolean) => {
    for (const layer of map.getStyle().layers) {
      if (
        layer.type !== "background" &&
        (!("source" in layer) || layer.source !== "openmaptiles")
      )
        continue;
      if (layer.id.startsWith("johor-") || layer.id.startsWith("gerak-"))
        continue;
      const sourceLayer = "source-layer" in layer ? layer["source-layer"] : "";
      const changes: [PaintProperty, string][] = [];
      if (layer.type === "background")
        changes.push(["background-color", "#e6ede1"]);
      if (layer.type === "fill")
        changes.push([
          "fill-color",
          sourceLayer === "water"
            ? "#aad2df"
            : sourceLayer === "building"
              ? "#b7c3b5"
              : sourceLayer === "landcover" || sourceLayer === "park"
                ? "#c5d7b6"
                : "#e1e8d9",
        ]);
      if (layer.type === "line" && sourceLayer === "transportation")
        changes.push([
          "line-color",
          layer.id.includes("casing") ? "#bdc8b8" : "#fcfaf0",
        ]);
      if (layer.type === "symbol" && layer.layout?.["text-field"])
        changes.push(["text-color", "#405747"], ["text-halo-color", "#f3f6eb"]);
      for (const [property, value] of changes) {
        const key = `${layer.id}:${property}`;
        if (!original.has(key))
          original.set(key, {
            id: layer.id,
            property,
            value: map.getPaintProperty(layer.id, property) ?? undefined,
          });
        map.setPaintProperty(
          layer.id,
          property,
          day ? value : original.get(key)!.value,
        );
      }
    }
    if (map.getLayer("my-mask"))
      map.setPaintProperty(
        "my-mask",
        "fill-color",
        day ? "#d0ddd3" : "#081817",
      );
  };
}
