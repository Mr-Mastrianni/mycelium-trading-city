# Environment art and materials

This pass replaces the initial primitive scenery with custom procedural botanical geometry:
curved tapering branches, instanced textured leaves, fern beds, detailed lathed mushroom
caps with underside gills, textured stem bodies, rounded stone edging, and a ribbed glass vault.

Optional photographed sandstone material:
- **Large Sandstone Blocks 01**, Rob Tuytel / Poly Haven
- Source: https://polyhaven.com/a/large_sandstone_blocks_01
- License: CC0 https://polyhaven.com/license
- Runtime diffuse: 1K JPG from dl.polyhaven.org. A locally generated paving texture
  remains available if the external image cannot load. External image loading and CORS
  require verification in an actual browser.

All leaf, bark, mushroom, grain, sky and contact-shadow textures are generated in the
application. No AI concept render is used as a flat backdrop. The world remains navigable.

## Quality and verification

The high setting uses a fixed soft directional shadow map and instanced foliage.
Moving bots use contact shadows; their shadow geometry is excluded from the static
map to avoid trails. Low quality disables directional shadows and limits pixel ratio.
The 3D candles also do not cast directional shadows.

The visual result is a procedural WebGL environment, not a promise of photographic
or offline concept-render fidelity. Current release checks cover the Vite bundle and
existing paper engine tests. A browser/device visual and performance review is still
needed, especially on Android. No live market feed, broker, or AI research backend
was introduced by this visual pass.
