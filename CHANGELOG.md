# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **modbus-source-router** node — routes incoming Modbus requests to different
  flow outputs based on the client's source IPv4 address.  Rules are expressed
  as CIDR blocks (`192.168.1.0/24`, `10.0.0.0/8`, `0.0.0.0/0`, …) and
  evaluated top-to-bottom; the first matching rule wins.  When no rule matches,
  the node sends a configurable Modbus exception response directly back to the
  client via the server config node and emits nothing on any output.
  IPv6-mapped IPv4 addresses (e.g. `::ffff:192.168.1.1`) are automatically
  normalised before evaluation.

## [0.1.0] — 2025-01-01

### Added
- Initial release.
- **modbus-dynamic-server-config** — Modbus TCP server configuration node with
  per-connection in-order response delivery and pending-request timeout.
- **modbus-dynamic-server** — emits incoming Modbus requests into a Node-RED
  flow as structured message objects.
- **modbus-dynamic-server-response** — sends a dynamic payload back to a
  waiting Modbus client.
- **modbus-registers-config** — in-memory register map supporting holding,
  input, coil, and discrete register types with multi-word encoding (int16,
  uint16, int32, uint32, float32) and configurable word-order modes
  (ABCD/CDAB/BADC/DCBA).
- **modbus-registers-write** — writes a single value into a register map.
- **modbus-registers-respond** — reads register values and responds to a
  pending Modbus request in one step.
- **modbus-proxy-target** — configuration node that maintains a persistent
  Modbus TCP client connection used by proxy flows.
- **modbus-dynamic-proxy** — forwards a pending Modbus request to a proxy
  target and returns the response to the originating client.

