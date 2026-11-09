# T002: Message protocol

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

## Description

Resolve the open decisions in [message-types.md](../../docs/message-types.md), then define shared message types and runtime validation.

## Done when

The protocol documents recovery behavior and validates incoming messages, with focused tests for invalid payloads.

## Work notes

Added validated configuration, state, control, and peer messages. Defined canonical collision cycles and a second readiness-confirmation exchange. Protocol validation tests pass.
