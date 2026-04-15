# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.5] - 2026-04-15

### Added
- Timestamped retained cache entries (`message` + `updatedAtMs`) for exact-topic channels.
- `caching-link-get` staleness controls: `maxAgeSeconds` (`0` = no expiration) and `outputExpired`.
- `caching-link-get` output metadata fields: `msg.cacheAgeMs`, `msg.cacheUpdatedAt`, and `msg.cacheExpired`.

### Changed
- `caching-link-get` now evaluates cache age and can suppress expired retained values when configured.
- `caching-link-get` continues merging cached fields over inbound fields while preserving inbound `_msgid`.
- `caching-link-out` zero-subscriber state is now neutral/informational (`0 subscribers`) instead of warning-like, while keeping visible subscriber counts.
- Topic validation remains strict (empty topic invalid at runtime) with clear misconfiguration statuses.

### Documentation
- README updated to clarify the two primary motivations: visible replacement for hidden context usage and more self-documenting link-style flow channels.
- README now documents poll-only retained-topic usage (`caching-link-out` + `caching-link-get`) where zero live subscribers is valid.

### Tests
- Expanded deterministic tests for timestamped cache entries, staleness/expiration behavior, metadata outputs, `_msgid` preservation, and neutral zero-subscriber status.

