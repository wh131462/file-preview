## ADDED Requirements

### Requirement: Renderer SHALL expose toolbar change subscription

Renderers implementing the `RendererHandle` interface SHALL provide an optional `onToolbarChange` method that allows the main component to subscribe to toolbar state changes.

#### Scenario: Renderer supports event subscription
- **WHEN** a renderer implements `RendererHandle` with `onToolbarChange` method
- **THEN** the method SHALL accept a callback function `() => void` as parameter
- **AND** the method SHALL return an unsubscribe function `() => void`

#### Scenario: Renderer does not support event subscription
- **WHEN** a renderer implements `RendererHandle` without `onToolbarChange` method
- **THEN** the main component SHALL fall back to polling mechanism
- **AND** no errors SHALL be thrown

### Requirement: Renderer SHALL notify on toolbar-relevant state changes

When internal state that affects toolbar content changes, the renderer SHALL invoke all subscribed listeners.

#### Scenario: Zoom level changes in Image renderer
- **WHEN** user zooms in or out (via mouse wheel, buttons, or gestures)
- **THEN** the renderer SHALL call all subscribed listeners immediately
- **AND** the main component SHALL receive the notification within 1ms

#### Scenario: Page number changes in PDF renderer
- **WHEN** user navigates to a different page
- **THEN** the renderer SHALL call all subscribed listeners immediately
- **AND** the updated page number SHALL appear in toolbar within 1ms

#### Scenario: Non-toolbar state changes
- **WHEN** internal state that does NOT affect toolbar changes (e.g., image position during drag)
- **THEN** the renderer SHALL NOT call subscribed listeners
- **AND** no unnecessary re-renders SHALL occur

### Requirement: Main component SHALL subscribe to renderer events

The main component SHALL detect if a renderer supports event subscription and subscribe accordingly.

#### Scenario: Renderer supports events
- **WHEN** a renderer provides `onToolbarChange` method
- **THEN** the main component SHALL call `onToolbarChange` with a listener callback
- **AND** the main component SHALL call `getToolbarGroups()` when the listener is invoked
- **AND** the polling interval SHALL NOT be created

#### Scenario: Renderer does not support events
- **WHEN** a renderer does NOT provide `onToolbarChange` method
- **THEN** the main component SHALL fall back to 100ms polling interval
- **AND** backwards compatibility SHALL be maintained

#### Scenario: Component unmounts
- **WHEN** the main component unmounts or switches to a different file
- **THEN** all event subscriptions SHALL be cleaned up via unsubscribe functions
- **AND** no memory leaks SHALL occur

### Requirement: Event system SHALL be memory-safe

The event subscription mechanism SHALL prevent memory leaks through proper cleanup.

#### Scenario: Subscription cleanup on unmount
- **WHEN** a component subscribing to renderer events unmounts
- **THEN** the unsubscribe function SHALL be called automatically
- **AND** the listener SHALL be removed from the renderer's listener set
- **AND** no references to the unmounted component SHALL remain

#### Scenario: Multiple subscriptions
- **WHEN** multiple components subscribe to the same renderer
- **THEN** all listeners SHALL be stored and invoked independently
- **AND** unsubscribing one listener SHALL NOT affect other listeners

### Requirement: Event system SHALL be performant

The event notification mechanism SHALL have minimal performance overhead.

#### Scenario: High-frequency updates
- **WHEN** renderer state changes rapidly (e.g., during zoom gesture at 60fps)
- **THEN** each state change SHALL trigger at most one event notification
- **AND** React's automatic batching SHALL prevent excessive re-renders
- **AND** CPU usage SHALL be lower than 100ms polling mechanism

#### Scenario: No listeners subscribed
- **WHEN** no components are subscribed to renderer events
- **THEN** the renderer SHALL NOT allocate event emitter resources
- **AND** state changes SHALL have zero event-related overhead

### Requirement: Implementation SHALL maintain backward compatibility

The new event system SHALL NOT break existing custom renderers or integrations.

#### Scenario: Legacy renderer without onToolbarChange
- **WHEN** a custom renderer implements only `getToolbarGroups()` without `onToolbarChange`
- **THEN** the main component SHALL successfully render the toolbar using polling
- **AND** no warnings or errors SHALL be logged
- **AND** the renderer SHALL function identically to the old implementation

#### Scenario: Migration from polling to events
- **WHEN** a renderer is updated to add `onToolbarChange` support
- **THEN** the main component SHALL automatically detect and use the new mechanism
- **AND** no changes to the main component code SHALL be required
- **AND** toolbar functionality SHALL remain identical from user perspective
