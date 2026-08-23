# Workshop Assembly asset provenance

The workshop scene uses the official NASA/JPL Mars 2020 Perseverance rover GLB:

- Original source payload (not shipped): `/tmp/pot-3d-research/perseverance.glb`
- SHA-256: `10db7c03a5e63a5a3b3e7baa6243aa4918ba045fa8ff0a731d0217491adc727f`
- Size: `4,987,176` bytes
- Source page: [NASA Science — Mars 2020 Perseverance Rover](https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/)
- Direct GLB source: [Mars 2020 Perseverance Rover.glb](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/mars-2020-perseverance-rover/Mars%202020%20Perseverance%20Rover.glb)
- NASA 3D source repository: [NASA-3D-Resources](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Mars%202020%20Perseverance%20Rover)
- Source attribution: **NASA/JPL-Caltech**; the NASA Science model details identify the source as **NASA/Jet Propulsion Laboratory** and the mission as Mars 2020: Perseverance Rover.

The source URL, SHA-256, and size above are retained for provenance. The downloaded source payload was used only for offline conversion and is not shipped from `public/`. Using `@gltf-transform/cli` **4.4.2**, the exact conversion was:

```sh
npx --yes @gltf-transform/cli copy /tmp/pot-3d-research/perseverance.glb /tmp/pot-3d-research/perseverance-uncompressed-20260818.glb
npx --yes @gltf-transform/cli optimize /tmp/pot-3d-research/perseverance-uncompressed-20260818.glb /tmp/pot-3d-research/perseverance-runtime-quantized-20260818.glb --compress quantize --texture-compress false --flatten false --instance false --palette false --join false --join-meshes false --join-named false --simplify false --weld false --resample false --prune false --prune-attributes false --prune-solid-textures false --sparse false
```

The browser loads the resulting `public/models/perseverance/perseverance-runtime.glb` through Three.js `GLTFLoader`; it uses `KHR_mesh_quantization`, which GLTFLoader handles without a Draco worker or WASM decoder. Because GLTFLoader creates local `blob:` URLs for the GLB's embedded PBR textures, the security policy allows `blob:` only in `connect-src` (the existing `img-src` and `media-src` policies already allow it). No remote origin is added.

- Runtime path: `public/models/perseverance/perseverance-runtime.glb`
- Runtime SHA-256: `a7527d095007d81627e310579273027fb13d707c6bc0b756b37525aac9013496`
- Runtime size: `8,129,008` bytes

The model is used as educational visual material in a scroll-driven workshop story. Pillars of Tech is not affiliated with, sponsored by, or endorsed by NASA, the Jet Propulsion Laboratory, or Caltech. NASA, JPL, and Caltech names, marks, and insignia are not used as site branding, and this implementation does not imply NASA approval of Pillars of Tech or its programs.

The scene presents four authored systems—Frame, Motion, Sense, and Lead—by moving named GLB assemblies from an exploded arrangement into their original transforms. No generated workshop raster imagery or procedural toy rover remains visible in the workshop render.
