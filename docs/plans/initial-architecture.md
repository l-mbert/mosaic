# Mosaic Initial Architecture

Status: initial technical plan

## Purpose

Mosaic is a local-first desktop mail client whose plugin system can understand and extend a user's
workflow. The system must support ordinary mail behavior without plugins while allowing plugins to
contribute inboxes, navigation, filters, message surfaces, composer actions, recommendations, and
full-page views.

This document defines the intended system structure: which runtime owns each responsibility, which
workspace packages express stable boundaries, and how Effect should be used. It does not prescribe
an implementation sequence.

The structure draws on the local t3code and Effect references, especially t3code's
[workspace layout](../../.repos/t3code/docs/internals/workspace-layout.md),
[provider architecture](../../.repos/t3code/docs/internals/providers.md), and Effect's
[local guidance](../../.repos/effect/LLMS.md). These repositories are references only and must not
be imported by Mosaic.

## Architectural principles

- Mosaic ships as one desktop product. Process separation is used for security, lifecycle, and
  fault isolation, not to create independent applications.
- The renderer is a client of a local engine. It does not own mail synchronization, durable mail
  state, credentials, provider connections, or plugin execution.
- Mail behavior remains useful without plugins. Plugins extend the product but do not define its
  core correctness.
- Contracts are explicit at every trust and process boundary. Unknown data is decoded once at the
  boundary and is typed thereafter.
- Effect owns long-lived resources, concurrency, retries, interruption, error channels, and service
  composition in privileged processes.
- Dynamic resources such as accounts and plugin installations are runtime instances. They are not
  modeled as singleton Effect service tags.
- Workspace packages exist for stable contracts, public APIs, or meaningful dependency boundaries.
  Internal folders are preferred when a separate package would only add ceremony.
- Provider-specific complexity stays in provider adapters. The mail engine operates on canonical
  capabilities and models.
- Local-first means that Mosaic has no required Mosaic-hosted backend. Provider network access is
  still necessary for mail synchronization and explicitly granted plugin integrations.

## Workspace layout

```text
apps/
  temp-ui/                       # Existing UI reference; not a production boundary
  desktop/
    src/
      main/                   # Electron main-process entry and services
      preload/                # Minimal renderer bridge
      renderer/               # React product UI
      utility/                # Local engine utility-process entry

packages/
  contracts/                  # Process contracts, RPC groups, wire schemas
  mail-core/                  # Canonical mail model and provider ports
  local-engine/               # Accounts, sync, search, drafts, outbox, recommendations
  storage-sqlite/             # SQLite repositories, migrations, FTS, blob metadata
  providers/
    src/
      driver.ts               # Provider driver SPI
      registry.ts             # Provider driver and live-instance lookup
      gmail/                  # Gmail API adapter
      graph/                  # Microsoft Graph adapter
      imap/                   # Generic IMAP and SMTP adapter
  plugin-protocol/            # Manifest, capabilities, contributions, UI protocol
  plugin-sdk/                 # Public plugin authoring API
  plugin-host-extism/         # Extism implementation of the plugin runtime
  ui/                         # Mosaic UI primitives and plugin-surface renderer

plugins/
  calendar/                   # First-party plugins use the public protocol
  deal-desk/
  assistant/

tools/
  plugin-cli/                 # Plugin validation, packaging, signing, and test harness
```

`apps/temp-ui` remains untouched as an isolated UI reference. Production code does not import from
it, and it is not part of the shipped application architecture.

`apps/desktop` is the sole product application and may contain several bundled entry points.
Electron main, preload, renderer, and utility code must not become separate workspace applications
merely because they run in separate processes.

Packages should expose explicit subpaths and avoid broad root barrels. For example, consumers
should import `@mosaic/providers/gmail` or `@mosaic/plugin-protocol/contributions`, not receive every
provider or protocol type through one index.

## Runtime boundaries

### Electron main process

The main process owns operating-system and Electron concerns:

- application and window lifecycle;
- custom protocols and deep links;
- utility-process creation, supervision, and shutdown;
- update lifecycle;
- native menus, notifications, and permission handlers;
- safe storage and operating-system credential integration;
- creation and transfer of message ports between trusted processes.

The main process must not contain mail synchronization, search, plugin, or recommendation logic.
It may expose narrow Effect services around Electron APIs so they are testable and participate in a
single scoped runtime.

### Preload

Preload is a small transport boundary. It exposes a typed Mosaic client or a single message-port
bootstrap through `contextBridge`. It must not expose `ipcRenderer`, filesystem access, arbitrary
channel names, or generic send/invoke functions.

### Renderer

The renderer owns presentation and interaction:

- React components and routes;
- query and mutation hooks over the local engine contract;
- transient window state;
- host rendering for declarative plugin surfaces;
- accessible, theme-aware UI primitives;
- sanitized display of mail content in an isolated surface.

The renderer never imports provider, storage, plugin-host, or Electron-main implementations.

### Utility process

The utility process is Mosaic's local sidecar and authoritative application engine. Electron main
starts it with `utilityProcess`, supervises it, and gives it private communication ports. It owns:

- the SQLite connection and migrations;
- provider connections and account sessions;
- synchronization, indexing, search, and the mutation outbox;
- MIME parsing and attachment storage;
- durable drafts;
- plugin installation state, activation, execution, and plugin-owned storage;
- recommendation collection and arbitration;
- the server side of renderer RPC.

The utility process is not a localhost HTTP server. A private message-port transport avoids port
discovery, local network authorization, CORS, and an unnecessary public listening surface.

## Package responsibilities

### `packages/contracts`

This package defines everything that crosses a process boundary:

- RPC groups and method names;
- command, query, result, and subscription schemas;
- encoded error schemas;
- renderer-safe DTOs;
- protocol version negotiation;
- utility-to-main requests such as credential access.

Contracts are transport-independent. Electron message ports are one transport implementation, not
part of the contract itself. The package contains schemas and small derived helpers, but no
repositories, Effect layers with operating-system dependencies, or application orchestration.

Effect Schema is authoritative for process, provider, persistence, and plugin boundaries. ArkType
may be used for renderer-local forms and view-specific validation, but it must not duplicate a wire
schema already owned by `packages/contracts` or `packages/plugin-protocol`.

### `packages/mail-core`

This package defines Mosaic's canonical mail language and provider-facing ports. It contains no
provider SDK and no Electron code.

The canonical model must distinguish:

- an `Account`, which is one configured mail identity;
- a `ProviderKind`, such as Gmail, Graph, or IMAP;
- a provider `Mailbox` or label from a Mosaic `View`;
- a `Thread` from an individual `Message`;
- a message envelope, MIME body parts, and attachments;
- a durable `Draft` from a transient editor buffer;
- a local mutation `OutboxEntry` from a provider's remote result;
- provider identifiers and cursors from Mosaic identifiers.

Identifiers should be schema-branded so that account, message, thread, view, and plugin IDs cannot
be mixed accidentally.

The provider port describes capabilities rather than assuming one protocol. It covers delta sync,
message retrieval, mailbox or label membership, thread information, mutations, draft upload, and
submission. Unsupported capabilities are represented explicitly.

### `packages/local-engine`

The engine contains application behavior and coordinates the other packages. Its internal folders
are capability-oriented, for example:

```text
src/
  accounts/
  mail/
  sync/
  drafts/
  outbox/
  search/
  recommendations/
  plugins/
```

Each capability owns its services, policies, commands, and focused tests. Provider details remain
behind the provider port, and SQL remains behind repository services. The engine maps internal
models to renderer-safe DTOs at the contract handler boundary.

### `packages/storage-sqlite`

This package implements persistence ports required by the engine:

- schema migrations;
- account, mailbox, thread, message, and draft repositories;
- synchronization checkpoints and provider cursors;
- a durable mutation outbox;
- FTS5 indexes;
- plugin installations, grants, settings, annotations, and namespaced key-value data;
- content-addressed blob metadata for raw messages and attachments.

SQLite is the durable source of truth and has one owning process. Raw RFC822 content and large
attachments should live in a content-addressed file store rather than large database rows. SQLite
stores their hashes, metadata, and ownership references.

Repository services return domain models and domain errors. Callers do not receive raw rows or SQL
errors. Transactions define the atomic boundary between normalized mail state, sync cursors,
indexes, and emitted change notifications.

### `packages/providers`

All built-in mail providers live in one package. Gmail, Graph, and IMAP are implementation folders,
not independent workspace packages. This keeps the common driver SPI, registry behavior, fixtures,
and conformance tests together while preserving explicit subpath imports.

The package uses two distinct abstractions:

- `MailProviderDriver` is a plain registered value containing static metadata, a configuration
  schema, and a scoped `create` function.
- `MailProviderInstance` is a live, account-specific value containing the adapter closures and
  capability description for one configured account.

A provider instance must not be a `Context.Service`. Effect service tags are singleton keys within
a runtime, while Mosaic must support several accounts using the same provider concurrently. A
single `ProviderRegistry` service owns the driver catalog and the map of live account instances.
It creates every instance in a child scope and closes that scope when the account is disabled,
reconfigured, removed, or the process stops.

The registry decodes provider configuration before invoking a driver. Provider adapters never
receive raw `unknown` configuration. The driver's Effect environment declares only the
infrastructure services that provider needs.

Gmail and Graph should preserve their native labels, conversations, change cursors, and mutation
semantics. IMAP and SMTP provide the generic fallback. The canonical model must not flatten every
provider to the limitations of IMAP.

### `packages/plugin-protocol`

This package is the versioned, serializable definition of a Mosaic plugin. It owns:

- plugin manifests and package identity;
- host API and protocol versions;
- capability requests and grants;
- activation events and invocation envelopes;
- contribution declarations;
- action and recommendation results;
- the declarative UI node and event protocol;
- structured plugin errors.

The protocol distinguishes a plugin package, installation, grant, activation, contribution, and
invocation. These have different lifecycles and must not be collapsed into one `Plugin` object.

### `packages/plugin-sdk`

The SDK is the public authoring surface. It provides typed builders, convenience APIs, test
fixtures, and protocol-compatible codecs. It depends on `plugin-protocol` and contains no host
implementation, Electron API, database access, or React runtime.

Plugin authors should express contributions as data and handlers:

- custom views and navigation items;
- message list decorations;
- surfaces above, instead of, or below a message;
- composer suggestions, actions, and validation;
- facets and saved-view predicates;
- recommendations and explicit follow-up actions;
- full plugin canvases.

### `packages/plugin-host-extism`

This package implements a generic `PluginRuntime` port with Extism. Extism is an execution adapter,
not the definition of the plugin system.

The host controls all capabilities. A plugin receives no direct database, mail store, filesystem,
credential, or unrestricted network access. Host functions operate on opaque IDs and enforce the
installation's current grants. Plugin storage is namespaced by installation. Network access is
allowlisted and brokered by the host.

Plugin calls have input, output, memory, and execution budgets. Failures are attributed to the
plugin and do not corrupt the mail engine. Plugin outputs are decoded before entering application
state. Stored annotations include plugin identity and version so stale derived data can be
invalidated or recomputed.

Extism executes plugin logic only. It does not render React components. Rich third-party plugin UI
must either use Mosaic's declarative UI protocol or run in a separately sandboxed web surface with
a narrow message bridge.

### `packages/ui`

This package contains host-owned visual primitives and the renderer for declarative plugin UI. It
may depend on React, Tailwind, and shadcn, but not on the engine, providers, storage, or Extism.

The plugin renderer validates the allowed node tree, resolves actions to protocol invocations, and
applies Mosaic typography, color, spacing, accessibility, and focus behavior. A plugin cannot
inject arbitrary React nodes into the main renderer.

## Effect architecture

Effect is the default application architecture in Electron main and the utility process. It is not
required for ordinary React rendering or local component state.

### Service modules

Infrastructure and application capabilities use the same module shape:

- a small interface exposed through `Context.Service`;
- a `make` effect or constructor;
- a dependency-preserving `layerNoDeps` when useful;
- a composed `layer` for the normal runtime;
- schema-tagged expected errors;
- named operations created with `Effect.fn("Service.operation")`.

Service methods expose domain errors. Raw promise rejections, native exceptions, provider errors,
and SQL errors are translated at the adapter that understands them. Defects are reserved for
violated invariants and failures that the caller cannot handle meaningfully.

### Composition roots

Each privileged process has exactly one runtime composition root:

- Electron main composes Electron and operating-system service layers.
- The utility process composes platform services, storage, provider registry, engine services,
  plugin runtime, RPC handlers, background workers, logging, and shutdown.

`Layer.mergeAll`, `Layer.provide`, and `Layer.provideMerge` make dependencies visible at these roots.
Application modules must not call `Effect.runPromise` internally. Imperative Electron callbacks and
message-port handlers use the process runtime to execute already composed effects.

### Resource ownership

Resources are scoped:

- database clients and transactions;
- provider sessions and network streams;
- per-account synchronization workers;
- plugin instances;
- subscriptions and message ports;
- file handles and MIME streams.

Acquisition and release use `Effect.acquireRelease`, scoped layers, and child scopes. Background
workers use scoped fibers, so process shutdown or account reconfiguration interrupts and cleans
them up deterministically.

### Concurrency and time

- `Stream` represents provider delta streams, subscription results, and incremental MIME input.
- Bounded `Queue` instances serialize account mutations and apply backpressure.
- `PubSub` fans committed engine changes out to interested in-process consumers.
- `Schedule` expresses retry and polling policy with bounded exponential backoff and jitter.
- Effect `Clock` and `DateTime` are used instead of ambient timers and `Date.now` in engine code.
- Per-account work is independent; work within one account preserves the ordering required by its
  provider and outbox.

Retries occur at the layer that knows whether an operation is idempotent. Authentication failures,
permission failures, malformed data, and unsupported capabilities are not generic retry cases.

### Dynamic instances

Accounts and plugin activations follow the driver-and-registry pattern used by t3code's providers.
Static drivers are plain values. A registry service materializes keyed instances in child scopes,
routes calls to them, exposes snapshots, and closes them deterministically. `LayerMap` may be used
inside a registry where its keyed lifecycle matches the required behavior.

### Observability

Named Effect operations provide spans by default. Logs and spans carry stable identifiers such as
account ID, provider kind, sync run ID, plugin ID, invocation ID, and RPC method. Message bodies,
recipient addresses, subject lines, OAuth material, and plugin secrets are excluded or redacted by
default.

Observability is local unless the user explicitly enables an external sink. Diagnostics should be
exportable without requiring a Mosaic service.

## RPC and renderer data flow

`packages/contracts` defines Effect RPC groups for commands, queries, and subscriptions. A custom
protocol layer carries the encoded frames over Electron message ports.

The contract should favor task-specific methods over generic access. Examples include querying a
view, reading a thread, applying a mail action, saving a draft, invoking a plugin action, and
subscribing to account or view changes. There is no generic SQL, filesystem, plugin-host, or provider
call endpoint.

The renderer uses:

- TanStack Query for engine-backed queries and mutations;
- TanStack Router for durable navigation and deep-linkable locations;
- Zustand for transient window state such as open tabs, pane sizes, selection, and local UI modes;
- component state for short-lived interaction details.

Mail records, provider state, plugin installation state, and durable drafts do not live in Zustand.
Committed engine events invalidate or update precise TanStack Query keys. Large bodies and
attachments are streamed or addressed by opaque handles instead of embedded in broad list DTOs.

## Mail synchronization and persistence

Synchronization is an offline-first reconciliation process:

1. A provider adapter reads changes after its durable cursor.
2. The engine normalizes provider data while preserving provider identifiers and semantics.
3. A transaction commits records, memberships, cursor progress, search changes, and derived work.
4. The engine publishes a committed change notification.
5. Plugin analysis and other derived work run from committed state and record provenance.

User mutations are written to a durable outbox before provider execution. Outbox entries have
idempotency identity, attempt state, retry policy, and a final provider result. Optimistic UI is
derived from the local mutation state; it is not mistaken for remote confirmation.

MIME parsing is streaming. Parsed HTML is untrusted, sanitized, and rendered in a constrained
document surface. Remote images and links pass through privacy and navigation policy. Attachments
are never executed by the renderer.

## Plugin contribution model

A plugin manifest declares contributions separately from capabilities. Installing a plugin does
not grant every requested capability. Grants can be scoped by account and revoked without removing
the plugin package.

The initial contribution vocabulary is:

- `ViewContribution`: a custom inbox or workflow-oriented collection;
- `NavigationContribution`: a sidebar item targeting a mailbox, view, canvas, or action;
- `FacetContribution`: a filter or query refinement;
- `MessageDecorationContribution`: compact list metadata;
- `MessageSurfaceContribution`: content above, replacing, or below a message;
- `ComposerContribution`: suggestions, actions, validation, or attachment generation;
- `RecommendationContribution`: a proposed user action with rationale, confidence, and expiry;
- `CanvasContribution`: a full plugin-owned workflow surface.

A provider mailbox, a Mosaic view, and a navigation item remain separate types even when all three
appear in the sidebar.

Multiple plugins may match the same placement. Arbitration is deterministic and considers
eligibility, declared priority, user preference, and exclusivity. A replacement surface never wins
because its plugin happened to be registered first. Core mail rendering always remains an available
fallback.

Recommendations are proposals, not mutations. A recommendation names its target, proposed action,
source plugin, rationale, confidence, and expiry. The host decides placement and ranking. Any
destructive or external action requires an explicit host-mediated command.

## Security and privacy boundaries

- Renderer processes use context isolation, sandboxing, no Node integration, and a restrictive
  content security policy.
- Email HTML and plugin UI are untrusted content even though the application is local-only.
- Main validates the sender and schema of every IPC request it handles.
- Renderer APIs are narrow and capability-specific.
- OAuth secrets are encrypted through the operating-system-backed Electron safe-storage service.
  The Linux backend is inspected and degraded protection is surfaced rather than silently assumed.
- The utility process receives credentials only when needed for an account session and never
  exposes them through renderer contracts or logs.
- Plugins access mail and external services only through granted host functions.
- Plugin packages and Wasm artifacts are content-hashed. Signing and provenance metadata are part
  of installation policy.
- External URLs are validated before being opened by the operating system.

Local-only storage does not by itself provide encryption at rest. Database encryption is a separate
product decision based on the intended threat model; operating-system full-disk encryption remains
the baseline assumption until that decision is made.

## Testing boundaries

Testing follows the same seams as the architecture:

- pure policy tests cover normalization, threading, view predicates, arbitration, and retry
  decisions;
- Effect service tests provide small test layers and use `@effect/vitest`;
- `TestClock` controls synchronization schedules, retries, snoozes, and recommendation expiry;
- provider conformance tests run the same behavioral contract against Gmail, Graph, and IMAP
  adapters using fixtures or controlled fakes;
- storage tests use temporary SQLite databases and verify transaction and migration behavior;
- plugin conformance tests run identical protocol cases against the in-process test runtime and the
  Extism runtime;
- contract tests encode and decode every RPC and plugin message at the boundary;
- process integration tests verify lifecycle, interruption, reconnection, and shutdown without
  timing sleeps.

Tests synchronize through receipts, queues, scopes, or observable state. They do not wait for
arbitrary timeouts and hope background work has completed.

## Dependency direction

The intended dependency flow is:

```text
renderer -> contracts, ui, plugin-protocol
preload  -> contracts
main     -> contracts, Electron adapters
utility  -> contracts, local-engine, storage-sqlite, providers, plugin-host-extism

local-engine       -> mail-core, plugin-protocol
storage-sqlite     -> mail-core, plugin-protocol
providers          -> mail-core
plugin-sdk         -> plugin-protocol
plugin-host-extism -> plugin-protocol
ui                 -> plugin-protocol
first-party plugin -> plugin-sdk
```

Dependencies do not point back toward the renderer or Electron. `mail-core` does not know about
SQLite or provider SDKs. `plugin-protocol` does not know about Extism or React. `contracts` does not
expose internal service implementations. These rules keep the local engine replaceable and make the
plugin protocol testable independently of its current runtime.
