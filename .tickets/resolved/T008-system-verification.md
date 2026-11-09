# T008: System verification and documentation

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

## Description

Verify the full five-instance flow, add a single startup command, and complete setup and testing documentation.

## Done when

A fresh checkout can run the system using the README; integration checks demonstrate collision, STOP, and coordinated restart.

## Work notes

Verified 18 tests, typecheck, lint, formatting, and client build. Smoke-tested the launcher with five separate Node processes; browser checks covered settings, Start/Pause/Resume/Stop, and recovery cancellation. Updated setup and protocol docs. All changes remain uncommitted; T010 tracks the development lint advisory.
