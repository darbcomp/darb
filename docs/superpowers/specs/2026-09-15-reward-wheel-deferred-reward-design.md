# Reward Wheel and Deferred Spin Reward Design

## Scope

Refine the existing Darb reward wheel and change only the `spin-next-10` entitlement from immediately usable to deferred until one later qualifying order exists. Preserve the current signup spin grant, guest confirmed-order claim flow, reward selection, reward codes, checkout pricing, promotion stacking, entitlement consumption, and cancellation restoration behavior.

## Wheel experience

For unauthenticated visitors, add a compact signup path above the existing guest-order claim form. The CTA closes the wheel and navigates to `/register`, allowing the existing registration controller and `Register.jsx` flow to create and reveal the signup spin.

Remove the customer-facing security implementation sentence. Make the dialog container programmatically focusable and focus it on mount without scrolling. Retain Escape handling, backdrop close, keyboard focus trapping, and restoration of the previously focused element. The close button receives visible focus only through normal keyboard navigation.

While the wheel is mounted, capture the current vertical scroll position and existing inline styles on `body` and the document element. Lock background scrolling with a fixed body positioned at the captured offset, prevent overscroll chaining on the overlay, and keep the overlay itself scrollable. Cleanup restores every captured inline style, restores the exact scroll position, and restores prior focus even after an unexpected unmount.

## Deferred entitlement rule

Add one shared eligibility helper in `entitlement.service.js`. Every entitlement except `spin-next-10` is immediately unlocked. A `spin-next-10` entitlement is unlocked only when at least one order satisfies all of these conditions:

- `Order.createdAt` is strictly later than `Entitlement.createdAt`.
- `Order.orderStatus` is not `cancelled`.
- For an account entitlement, `Order.customer` matches `Entitlement.user`.
- For a guest entitlement, `Order.customerSnapshot.phone` matches an Egyptian phone identity variant derived from the normalized `Entitlement.ownerPhone`.

The query runs before pricing and before the current order is saved. Consequently, the first order after the reward cannot unlock itself, while a subsequent checkout sees that persisted order and may use the reward. The original order that produced the spin predates the entitlement and cannot count.

The shared helper is used both for API presentation and inside the authoritative entitlement application path. Therefore manual reward-code and `entitlementId` requests receive the same safe locked-reward error. No lock field is persisted.

## API and customer presentation

Reward serialization adds a backwards-compatible derived `locked` boolean while preserving `available`, `used`, and `expired` status values. Locked rewards remain in the available collection and history.

Update `spin-next-10` wording consistently:

- Wheel segment: `10% after 1 order`
- Reward label: `10% off after your next order`
- Usage explanation: `Place one order first. Your 10% reward unlocks for the following order.`
- Locked status hint: `Unlocks after your next order`
- Early-use error: `This reward unlocks after you place one order. Use it on the following order.`

Add natural Arabic equivalents through the existing static translation dictionary. Account cards show the locked hint and deferred usage text. Checkout keeps the reward visible but disables its control until unlocked. Guest reward codes remain copyable. Reward emails use deferred-specific instructions while retaining the code for guests and account-storage wording for signed-in customers.

## Verification

Extend the existing Node reward/order tests to cover immediate locking, order chronology, cancelled orders, account and normalized-phone ownership, code and ID bypass prevention, unchanged behavior for other spin and signup rewards, consumption after valid use, and existing cancellation restoration. Extend email presentation tests for signed-in and guest deferred wording.

Run focused reward/order and email tests, relevant existing server tests, client lint, one client production build, `git diff --check`, and desktop/mobile modal sanity checks when practical. Inspect the final diff before committing and pushing to `main`.
