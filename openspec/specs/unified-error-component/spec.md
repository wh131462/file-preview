# unified-error-component Specification

## Purpose
Provide a unified `RendererError` component used by all file type renderers in both React and Vue packages to display error states with consistent visual style, behavior, and accessibility.

## Requirements

### Requirement: Display error message
The `RendererError` component SHALL display a primary error message to inform users of the failure.

#### Scenario: Error message is displayed
- **WHEN** the component receives a `message` prop
- **THEN** the component displays the message with appropriate typography and color

#### Scenario: Message is required
- **WHEN** the component is rendered without a `message` prop
- **THEN** the component SHALL fail to render or display a fallback error

### Requirement: Display optional error details
The `RendererError` component SHALL support displaying additional technical error details when provided.

#### Scenario: Detail is provided
- **WHEN** the component receives both `message` and `detail` props
- **THEN** the component displays both the message and detail with distinct visual hierarchy

#### Scenario: Detail is omitted
- **WHEN** the component receives only a `message` prop without `detail`
- **THEN** the component displays only the message without detail section

### Requirement: Consistent visual style
The `RendererError` component SHALL use a consistent visual design across all file type renderers.

#### Scenario: Standard layout
- **WHEN** the component is rendered
- **THEN** the component displays with centered alignment, icon, title, and optional detail

#### Scenario: Color scheme
- **WHEN** the component is rendered
- **THEN** the component uses red accent colors (red-400 for icon, red-500/10 for background)

#### Scenario: Typography
- **WHEN** the component is rendered
- **THEN** the message uses `text-lg` (mobile) or `text-xl` (desktop) with `font-medium`, and detail uses `text-sm` with `text-fg-tertiary`

### Requirement: Icon display control
The `RendererError` component SHALL allow controlling the visibility of the error icon.

#### Scenario: Icon shown by default
- **WHEN** the component is rendered without specifying `showIcon`
- **THEN** the component displays the AlertCircle icon

#### Scenario: Icon hidden when disabled
- **WHEN** the component is rendered with `showIcon={false}`
- **THEN** the component does not display the icon

### Requirement: Responsive layout
The `RendererError` component SHALL adapt to different screen sizes.

#### Scenario: Mobile layout
- **WHEN** the component is rendered on mobile viewport (< 640px)
- **THEN** the component uses smaller font sizes and appropriate spacing

#### Scenario: Desktop layout
- **WHEN** the component is rendered on desktop viewport (≥ 640px)
- **THEN** the component uses larger font sizes and appropriate spacing

### Requirement: Framework support
The system SHALL provide `RendererError` implementations for both React and Vue frameworks.

#### Scenario: React component
- **WHEN** a React renderer needs to display an error
- **THEN** it can import and use `RendererError` from `@eternalheart/react-file-preview`

#### Scenario: Vue component
- **WHEN** a Vue renderer needs to display an error
- **THEN** it can import and use `RendererError` from `@eternalheart/vue-file-preview`

### Requirement: Integration with existing renderers
All file type renderers SHALL use the unified `RendererError` component instead of custom error displays.

#### Scenario: React renderer integration
- **WHEN** a React renderer encounters an error state
- **THEN** it renders the `RendererError` component with appropriate message and detail

#### Scenario: Vue renderer integration
- **WHEN** a Vue renderer encounters an error state
- **THEN** it renders the `RendererError` component with appropriate message and detail

#### Scenario: Backwards compatibility
- **WHEN** existing error states are migrated to use `RendererError`
- **THEN** the visual appearance and user experience remain consistent or improved

### Requirement: Framework-specific Tailwind prefix
The `RendererError` (and any sibling shared components such as `RendererLoading`) SHALL use the Tailwind class prefix declared by the package it ships in. The React package uses `rfp-` and the Vue package uses `vfp-`; cross-package copy-paste MUST update every class accordingly.

#### Scenario: React package classes
- **WHEN** a shared renderer component lives in `packages/react-file-preview`
- **THEN** every Tailwind utility class in its template/JSX SHALL be prefixed with `rfp-` (e.g. `rfp-flex`, `rfp-text-lg`, `md:rfp-text-xl`)

#### Scenario: Vue package classes
- **WHEN** a shared renderer component lives in `packages/vue-file-preview`
- **THEN** every Tailwind utility class in its template SHALL be prefixed with `vfp-` (e.g. `vfp-flex`, `vfp-text-lg`, `md:vfp-text-xl`)

#### Scenario: No cross-package prefix leakage
- **WHEN** a component is ported from one package to the other (e.g. React → Vue)
- **THEN** the destination file MUST NOT contain any class names using the source package's prefix; a repo-wide grep for the wrong prefix inside the destination package SHALL return zero matches

#### Scenario: Responsive variant prefixing
- **WHEN** a responsive variant such as `md:`, `sm:`, `lg:` is applied
- **THEN** the prefix appears between the variant and the utility name (e.g. `md:vfp-text-xl`, not `vfp-md:text-xl`)
