<!-- Thanks for contributing to Tychee. -->

## Contributor License Agreement

- [ ] I have read [`CLA.md`](../CLA.md) and I agree to its terms for this and my future contributions.

<!--
This box is the record of your agreement — there's no bot and no separate signing
step, so please don't tick it without reading the document. Tychee is licensed
under BSL 1.1, not a permissive licence, and the CLA grants Tychee Labs rights in
your contribution including the right to include it in commercially licensed
distributions.

If you're contributing on behalf of an employer, confirm you're authorised to
agree on their behalf.

We can't merge with this unticked. If you'd rather not agree, say so and we'll
close the PR without prejudice — better that than you finding out after the fact.
-->

## What this changes

<!-- One or two sentences. What behaviour is different after this PR? -->

Closes #

## Why

<!--
If the issue already covers the reasoning, "see issue" is fine.

If you made a judgement call the issue left open to you — and several of our
issues deliberately do — explain what you picked and what you rejected. That's
the part a reviewer can't reconstruct from the diff.
-->

## How it was verified

Tick what you actually ran. Please don't tick things you didn't.

- [ ] `npm run build`
- [ ] `cd sdk && npm run build`
- [ ] `cd soroban && cargo test --workspace`
- [ ] Manually exercised in a browser
- [ ] Verified against Stellar testnet

<!--
Known environment issues as of this template — not caused by your change:

- On Windows, plain `npm install` fails. A transitive postinstall from the Trezor
  module in stellar-wallets-kit runs `yarn setup || true`, and neither `yarn` nor
  the `|| true` fallback works under cmd. Use `npm install --ignore-scripts`.
- `npm run lint` hangs. There is no ESLint config committed, so `next lint`
  waits forever on its interactive setup prompt. Don't tick it, don't wait on it.
- `npm test` exits 1 with "No tests found" because there are no JS test files
  yet. If you add the first ones, say so — you'll be changing that from a
  failure into a real signal.
- Rust builds need the MSVC linker on Windows (Visual Studio Build Tools with the
  C++ workload) or a GNU toolchain. `cargo` alone is not sufficient.

If you fix any of these as part of your PR, mention it — they're each tracked
separately and we don't want two people on the same thing.
-->


For anything touching Soroban or the SDK's on-chain paths, unit tests alone
aren't sufficient evidence. Include the contract ID and transaction hash you
tested against.

Contract ID:
Transaction hash:

<!--
If you couldn't run something — missing dependency, no testnet funds, Windows
vs Linux difference — say so here rather than leaving the box unticked with no
explanation. "I couldn't run X because Y" is a useful review comment. Silence
isn't.
-->

## Scope and follow-ups

<!--
Anything you found but deliberately didn't fix? List it. Several of our issues
explicitly ask you to report rather than fix things you stumble across, and we'd
rather have a linked follow-up issue than a PR that quietly grew a second
purpose.

Anything a reviewer should look at especially carefully?
-->

## Checklist

- [ ] Commit messages describe the change (we loosely follow conventional commits)
- [ ] Rust changes are `cargo fmt` clean
- [ ] TypeScript follows the existing style in the files touched
- [ ] No secrets, keys, real card numbers, or `.env` values in the diff
- [ ] Tests added for new behaviour or bug fixes
- [ ] Docs updated if this changes a documented interface

<!--
Security note: if while working on this you found something exploitable, please
don't describe it here. Email ops@tychee.store instead and we'll sort out
disclosure. A public PR description is a bad place for a working attack.
-->
