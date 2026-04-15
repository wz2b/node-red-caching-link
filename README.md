# @wz2b/node-red-caching-link

`@wz2b/node-red-caching-link` provides visible, topic-based retained links for Node-RED with three nodes: `caching-link-out`, `caching-link-in`, and `caching-link-get`. It is designed to keep shared retained state visible on the canvas, so flow-level channels look and feel more like off-page connectors or schematic flags rather than hidden state inside function code.

## Why this exists

This package has two practical goals. First, it provides a visible replacement for hidden context usage (`flow.get()` / `flow.set()`), so retained channels are explicit on the canvas instead of buried in function code. Second, it makes link-style flow connections more self-documenting: topic labels and live status (including subscriber counts) are visible directly on each node, so you do not need to hover or open configuration just to understand intent.

## Nodes

### `caching-link-out`

- Exact-topic publisher
- Stores the latest message for its topic in an in-memory retained cache with a last-updated timestamp
- Forwards the message to all matching `caching-link-in` nodes
- Shows live receiver count status:
  - invalid topic -> `invalid topic`
  - 0 subscribers -> `0 subscribers` (neutral informational state)
  - 1 subscriber -> `1 subscriber`
  - N subscribers -> `N subscribers`

### `caching-link-in`

- Exact-topic receiver
- Receives forwarded messages from matching `caching-link-out` nodes
- Outputs those messages to the flow

### `caching-link-get`

- Exact-topic retained reader
- On input, reads retained message for the topic
- Supports staleness options:
  - `maxAgeSeconds` (`0` means no expiration limit)
  - `outputExpired` (`false` suppresses expired outputs)
- If retained message exists:
  - clones inbound message
  - clones retained message
  - merges into one output where retained fields override inbound fields
  - preserves inbound `_msgid`
  - adds cache metadata fields:
    - `msg.cacheAgeMs`
    - `msg.cacheUpdatedAt`
    - `msg.cacheExpired`
- If no retained message exists: sends nothing

## Semantics and caveats

- Exact-topic matching only in v1 (no wildcard subscriptions)
- Topic must be a non-empty string at runtime
- Retained messages are in-memory only
- Cache/registry are shared only within one Node-RED runtime process
- Retained cache is lost on runtime restart/redeploy
- Cached entries include both the retained message and `updatedAtMs` timestamp
- `caching-link-get` merge rule: retained fields override inbound fields, inbound `_msgid` is preserved
- When `maxAgeSeconds > 0`, cached entries are treated as expired once age exceeds that limit
- When expired and `outputExpired=false`, `caching-link-get` sends nothing
- A topic may intentionally have zero live `caching-link-in` subscribers when used as a poll-only retained channel via `caching-link-get`

## Example usage

### 1) Status producer with multiple visible consumers

One flow computes current machine status and sends it to `caching-link-out(topic="machine/status")`. Multiple flows place `caching-link-in(topic="machine/status")` nodes to consume the same stream. The out node status shows how many consumers are currently linked.

### 2) Retained state lookup across flows

Flow A writes latest configuration/state to `caching-link-out(topic="plant/target")`. Later, Flow B triggers `caching-link-get(topic="plant/target", maxAgeSeconds=30, outputExpired=false)` before a control action. The get node merges retained state onto the current trigger message only when fresh enough, and adds `cacheAgeMs`, `cacheUpdatedAt`, and `cacheExpired` for downstream decisions.

### 3) Poll-only retained variable pattern

Some topics are intentionally write-and-poll channels: a `caching-link-out` keeps the latest retained value, there are no matching `caching-link-in` nodes, and one or more `caching-link-get` nodes read on demand. In this pattern, zero live subscribers is valid and expected, not an error.

## Install

```bash
npm install @wz2b/node-red-caching-link
```

Then restart Node-RED and add the nodes from the editor.

## Development

```bash
yarn install
yarn test
```

Tests use `mocha` and `node-red-node-test-helper`.
