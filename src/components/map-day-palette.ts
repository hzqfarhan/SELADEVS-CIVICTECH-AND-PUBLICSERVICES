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
        changes.push(["background-color", "#e1e5ed"]);
      if (layer.type === "fill")
        changes.push([
          "fill-color",
          sourceLayer === "water"
            ? "#aad2df"
            : sourceLayer === "building"
              ? "#b5bac3"
              : sourceLayer === "landcover" || sourceLayer === "park"
                ? "#b6c2d7"
                : "#d9dee8",
        ]);
      if (layer.type === "line" && sourceLayer === "transportation")
        changes.push([
          "line-color",
          layer.id.includes("casing") ? "#b8bec8" : "#fcfaf0",
        ]);
      if (layer.type === "symbol" && layer.layout?.["text-field"])
        changes.push(["text-color", "#404857"], ["text-halo-color", "#ebeff6"]);
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
          day
            ? value
            : property === "background-color"
              ? "#101722"
              : property === "fill-color"
                ? sourceLayer === "water"
                  ? "#080f1a"
                  : sourceLayer === "building"
                    ? "#26354a"
                    : "#172334"
                : property === "line-color"
                  ? layer.id.includes("casing")
                    ? "#172334"
                    : "#35455b"
                  : property === "text-color"
                    ? "#aab7ca"
                    : "#101722",
        );
      }
    }
    if (map.getLayer("my-mask"))
      map.setPaintProperty(
        "my-mask",
        "fill-color",
        day ? "#d0d5dd" : "#080f1a",
      );
  };
}
