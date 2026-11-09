# T006: Simulation controls and recovery

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

## Description

Implement start, pause, STOP, and coordinated restart, including disconnect handling.

## Done when

Group-wide collision recovery and the five-second wait follow the agreed protocol and have meaningful coordination tests.

## Work notes

Implemented start/pause/stop and peer-only recovery with a five-second countdown. Integration verifies restart and pause on required-peer disconnect.
