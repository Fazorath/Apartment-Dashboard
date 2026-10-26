# 0001. The TV pairs as a read-only Display

Status: accepted (2026-10-25)

## Context

The living-room TV is an Insignia Fire TV, using its Silk browser. It shows the Apartment's Chores all day, and nobody sits at it. A normal sign-in is a 7-day bearer token with full edit rights. Two-factor login means typing a code with a remote, and the only way to revoke a session is a password change.

## Decision

The TV opens the Display page, which shows a short-lived **Pairing code**. A Roommate enters that code in Settings, and the TV receives a read-only Display credential, which it keeps. That credential works only on new read-only Display endpoints, never with the normal session middleware. It doesn't expire. An Apartment has one Paired Display at a time: pairing a new screen unpairs the old one, and any Roommate can unpair it. When the credential is missing or revoked, the TV goes back to showing a Pairing code.

## Alternatives considered

- **Log in on the TV and keep the session.** Rejected: it puts full edit rights on a shared screen, the session expires weekly, and 2FA is painful with a remote.
- **A secret Display link, typed in once and bookmarked.** Simpler, but typing a 12-character secret with a remote is clumsy, and if the bookmark is lost someone has to type it again.
- **Allow it only from the home network.** Rejected: it depends on hosting and network setup that don't exist yet, and it exposes the Display to anyone on the Wi-Fi with no way to revoke.

## Consequences

Whoever holds the TV's credential can see the Apartment's Chores until a Roommate unpairs it. That's why the credential is read-only and leaves out Chore notes. The pairing endpoints can be reached without signing in, so they need rate limits and short code lifetimes.
