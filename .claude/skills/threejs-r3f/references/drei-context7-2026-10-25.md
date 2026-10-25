### Instances with limit and range

Source: https://github.com/pmndrs/drei/blob/master/docs/performances/instances.mdx

Declarative wrapper around THREE.InstancedMesh. Use limit and range to control buffer size and draw-range. Place geometry and material as children, then add multiple Instance components with props like color, scale, position, rotation, and event handlers.

```jsx
<Instances
  limit={1000} // Optional: max amount of items (for calculating buffer size)
  range={1000} // Optional: draw-range
>
  <boxGeometry />
  <meshStandardMaterial />
  <Instance
    color="red"
    scale={2}
    position={[1, 2, 3]}
    rotation={[Math.PI / 3, 0, 0]}
    onClick={onClick} ... />
  // As many as you want, make them conditional, mount/unmount them, lazy load them, etc ...
</Instances>
```

--------------------------------

### Billboard

Source: https://github.com/pmndrs/drei/blob/master/docs/abstractions/billboard.mdx

The Billboard component adds a group that always faces the camera. It accepts props to control following and axis locking.

```APIDOC
## Billboard

### Description
Adds a `<group />` that always faces the camera.

### Props
- **follow** (boolean) - Optional - Whether the billboard should follow the camera's rotation. Default is `true`.
- **lockX** (boolean) - Optional - Lock the rotation on the x axis. Default is `false`.
- **lockY** (boolean) - Optional - Lock the rotation on the y axis. Default is `false`.
- **lockZ** (boolean) - Optional - Lock the rotation on the z axis. Default is `false`.

### Example
```jsx
<Billboard
  follow={true}
  lockX={false}
  lockY={false}
  lockZ={false} // Lock the rotation on the z axis (default=false)
>
  <Text fontSize={1}>I'm a billboard</Text>
</Billboard>
```
```

--------------------------------

### Stage Component

Source: https://github.com/pmndrs/drei/blob/master/docs/staging/stage.mdx

The Stage component creates a stage with proper studio lighting, shadows, and optional zoom to fit. It accepts props for lighting preset, shadow type, camera adjustment, environment, intensity, and centering.

```APIDOC
## Stage Component

### Description
Creates a "stage" with proper studio lighting, 0/0/0 top-centred, model-shadows, ground-shadows and optional zoom to fit. Make sure to set `makeDefault` on your controls when `adjustCamera` is true!

### Props
- **preset** (string | object) - Optional - Lighting setup, default: "rembrandt". Can be one of: 'rembrandt', 'portrait', 'upfront', 'soft', or an object with `main` and `fill` arrays of [x, y, z] coordinates.
- **shadows** (boolean | string | object) - Optional - Controls the ground shadows, default: "contact". Can be `true`, `false`, 'contact', 'accumulative', or a `StageShadows` object.
- **adjustCamera** (boolean | number) - Optional - Optionally wraps and thereby centers the models using <Bounds>, can also be a margin, default: true.
- **environment** (string | object) - Optional - The default environment, default: "city". Can be a preset type or partial environment props.
- **intensity** (number) - Optional - The lighting intensity, default: 0.5.
- **center** (object) - Optional - To adjust centering, default: undefined. Accepts partial `CenterProps`.

### StageShadows Type
- **type** (string) - Required - 'contact' or 'accumulative'
- **offset** (number) - Optional - Shadow plane offset, default: 0
- **bias** (number) - Optional - Shadow bias, default: -0.0001
- **normalBias** (number) - Optional - Shadow normal bias, default: 0
- **size** (number) - Optional - Shadow map size, default: 1024
- Plus partial props from `AccumulativeShadowsProps`, `RandomizedLightProps`, and `ContactShadowsProps`.

### Usage Examples

#### Basic usage with contact shadows and auto-centering
```jsx
<Stage adjustCamera intensity={0.5} shadows="contact" environment="city">
  <mesh />
</Stage>
```

#### Accumulative shadows with canvas shadows enabled
```jsx
<Canvas shadows>
  <Stage shadows="accumulative">
    <mesh castShadow />
  </Stage>
</Canvas>
```
```

--------------------------------

### Basic Stage usage with contact shadows

Source: https://github.com/pmndrs/drei/blob/master/docs/staging/stage.mdx

Basic usage of the Stage component with default contact shadows and auto-centering. Sets adjustCamera, intensity to 0.5, shadows to 'contact', and environment to 'city'.

```jsx
<Stage adjustCamera intensity={0.5} shadows="contact" environment="city">
  <mesh />
</Stage>
```

--------------------------------

### Basic ContactShadows usage

Source: https://github.com/pmndrs/drei/blob/master/docs/staging/contact-shadows.mdx

Renders a contact shadow with opacity 1, scale 10, blur 1, far 10, resolution 256, and color #000000. The scale can be a positive number or a 2D array [x, y].

```jsx
<ContactShadows opacity={1} scale={10} blur={1} far={10} resolution={256} color="#000000" />
```
