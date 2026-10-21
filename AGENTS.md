# AGENTS.md — Product-quality UI engineering

> Persistent instructions for coding agents working on this repository. Apply these standards to every task that creates, changes, reviews, or fixes a **visual interface**: websites, landing pages, dashboards, editors, dialogs, navigation, forms, and responsive views. For tasks with no UI impact, do not force the UI workflow.

## Mission

Build interfaces that feel thoughtfully designed **and** work reliably: clear, distinctive, restrained, accessible, responsive, fast, and polished in the small details. A premium UI is not a pile of effects. It is good hierarchy, typography, spacing, sensible components, excellent states, and motion that helps users understand what happened.

**Quality order:** Correct behavior → content hierarchy → layout → typography → spacing → component consistency → contrast → interaction states → responsive behavior → purposeful motion → decorative polish.

Treat these as defaults, not permission to override the user's specific design or the project's established visual language.

## 1. Always start with the right skills

**For every UI task, inspect the skills actually available in the current agent/runtime and read the relevant `SKILL.md` instructions before editing.** Don't pretend an unavailable skill ran. Don't dump or run all skills for every change; select the narrowest useful set. Skills guide judgment; they do not supersede the user's exact visual target.

### Core design pair — consult on every substantial UI task **when installed**

| Skill | What to apply | Boundaries |
| --- | --- | --- |
| `emil-design-eng` (Emil Kowalski) | Interaction craft, detail quality, motion decisions, perceptual polish | A skill is not a request to animate everything. |
| `kumo-design` (Cloudflare Kumo) | Optical alignment, text hierarchy, spacing, UI density, component states, restrained surfaces | Its strict rules belong to Kumo-style **product UI**. Do not blindly impose its 14px-all-content convention or Kumo components on editorial/marketing sites. |

**Project's existing system wins:** If tokens/components are already established, refine and reuse them. Do **not** combine Kumo, shadcn, Radix, custom components, and other kits on the same surface just because they're available. Choose **one primary component language**.

### Activate these **only when the task matches**

| Task | Preferred skill(s) if available |
| --- | --- |
| Create / refine an interaction or animation | `animate`; `review-animations` after implementing |
| Existing app has inconsistent or awkward motion | `improve-animations` → focused fixes → `review-animations` |
| Site may benefit from motion, but it's unclear where | `find-animation-opportunities` |
| Animation stutters | `animation-performance`, then React performance guidance |
| Apple-like feel / native interaction quality | `apple-design`; `mobile-native` for mobile web; `animate-expo` **only** for Expo/React Native |
| Changing a UI library / introducing components | `pick-ui-library` before selection |
| Stress-testing clipping, overflow, content edge cases | `break-ui` |
| Toasts and notifications | `ask-sonner` **if Sonner is actually used** |
| Screenshot or mockup → implementation | `product-design/image-to-code` and `product-design/design-qa` in a compatible runtime |
| Authorized *exact* website recreation | `product-design/url-to-code` and `design-qa` in a compatible runtime |
| UX audit or current product critique | `product-design/audit` |
| Explore new concepts before implementation | `product-design/get-context` → `product-design/ideate` |
| Working from an actual Figma source | `figma/figma-design-to-code`; `figma/figma-implement-motion` if motion specified |
| Build or update an editable Figma design system | `figma/figma-use` + `figma/figma-generate-library` |
| Build an editable Figma screen | `figma/figma-use` + `figma/figma-generate-design` |
| React / Next.js implementation or refactor | `vercel/react-best-practices` |
| Verify a working site end to end | `vercel/verification`, when available |
| Typography research or visual collateral | Adobe fonts / templates / mockups **only when relevant** |

Skill availability depends on the runtime. Some ChatGPT Product Design features require Work mode; some Figma/Adobe operations require connected services. If unavailable, follow the standards below directly and disclose what could not be verified.

### Source links (for identifying the right skill, not blindly installing software)

- Emil Kowalski: https://github.com/emilkowalski/skills
- Cloudflare Kumo skill: https://kumo-ui.com/skill/
- Kumo components: https://github.com/cloudflare/kumo

If these third-party skills are missing in a compatible coding-agent environment, the maintainer can install them with:

```bash
npx skills add emilkowalski/skills
npx skills add cloudflare/kumo@kumo-design
```

Never claim the packages are installed just because these links or commands appear here. The **skill** and the **React component library** are separate things; installing `kumo-design` does not add `@cloudflare/kumo` to the app.

## 2. Pick the correct design mode before editing

**A. Exact reproduction** — user says *exactly*, *copy this design*, *match this screenshot*, *only change the words*:
- Reference is the specification, not an inspiration board. Preserve layout, sizes, spacing, fonts, color, component shapes, imagery placement, section order, and interactions as far as technically possible.
- Don't introduce your own gradients, cards, animations, layouts, theme playgrounds, or extra sections.
- Inspect source code/assets/DOM when authorized and available; compare rendered screenshots. Explicitly report anything you could not reproduce.
- Respect source ownership, licenses, and permissions.

**B. Improve an existing UI** — user says *polish*, *fix*, *clean up*, *make it better*:
- Audit before changing. Retain the working identity, composition, and behavior.
- Prioritize the three most visible or damaging problems; do not redesign unrelated parts.
- Check at least the current view, mobile view, interactive states, and (when present) dark mode.

**C. New design** — user wants a fresh page or app:
- Define audience, goal, primary action, product personality, and important content.
- Choose **one** cohesive art direction based on the brief and references. Build a deliberate composition, not a generic AI-generated template.
- Make the first screen communicate the product clearly. Then design subsequent sections around evidence, benefits, and action.

**D. Small targeted fix** — a text wrap, button, spacing bug, clipped menu, contrast regression:
- Solve the problem in the smallest reliable diff. Do not invoke a large redesign workflow.

If the user's goal and references already answer the design questions, proceed without asking again. State any important assumption in one concise sentence.

## 3. Inspect the actual project

Before coding:

1. Read the framework, scripts, package manager, styling setup, existing components, fonts, tokens, icon set, route layout, and conventions. Look for existing `AGENTS.md` or design guidelines; honor more specific instructions.
2. Find the **source of truth** for the current UI: repository code, actual Figma design, screenshot, live page (authorized), or user brief. Do not guess a page structure when inspectable source exists.
3. Reuse existing design tokens, CSS variables, components, assets and dependencies wherever sound. Avoid adding overlapping component libraries or gratuitous packages.
4. Identify the affected route(s), responsive breakpoints, states, and interactions. Note which other screens share components before changing them.
5. For substantial changes, formulate a short implementation plan and acceptance criteria; then implement in the same task. Do not waste time planning tiny fixes.

Do not make claims about “pixel perfect”, “working”, or “responsive” before checking the rendered result.

## 4. Visual system — restraint with a point of view

### Hierarchy and layout

- Make primary and secondary actions unmistakable. Each major screen/section should have one focal point.
- Use deliberate content width, grid, alignment, and a repeatable spacing scale; avoid arbitrary `px` values for every element.
- Group related elements tightly; separate unrelated groups visibly. Use whitespace before drawing another border or card.
- Align icons optically with labels; standardize heights, paddings, corner radii, and icon sizes.
- Use responsive composition, not a shrunk desktop screenshot. Change stacking/order/behavior when necessary.
- Avoid horizontal overflow, abrupt content jumps, clipped dialogs, and overlapping sticky surfaces.

### Typography

- Use the project's existing font family first. If starting from scratch, choose a purpose-fit, licensed font (e.g. Geist or Inter for a neutral product UI) and verify it actually loads.
- Maintain a small type scale and purposeful weight hierarchy. Prefer medium/semibold over excessive boldness in dense product UI.
- Product UI body text often works in the 14–16px range; editorial/marketing body text may need 16–18px. Do **not** universalize Kumo's 14px rule beyond Kumo-style surfaces.
- Tune line length and line height before artificially squeezing tracking. Use sentence case for ordinary product headings unless a brand treatment requires otherwise.
- Ensure numeric data aligns where appropriate (`tabular-nums`). Don't substitute decorative fonts for readability.

### Color and surfaces

- Reuse the project's brand. Otherwise build a restrained neutral-first palette with **at most one primary accent** until there is a real reason for more.
- Don't default to purple gradients, glowing blobs, glassmorphism, dotted backgrounds, excessive shadows, or decorative noise.
- Use surface/background layering, subtle separators, and good contrast instead of outlining every container.
- When dark mode exists, verify every text tier, border, button, icon, input, hover, selected state, and tooltip **in dark mode**. Likewise verify light mode.
- Target WCAG AA contrast for text and controls where applicable. Never encode status solely by color.

### Components and copy

- Use a coherent component family for buttons, inputs, popovers, tabs, dialogs, dropdowns, tables, and cards.
- Implement hover, `focus-visible`, pressed, selected, disabled, pending/loading, empty, success, error, and long-content states **where relevant**.
- Prefer semantic HTML, native behavior, robust focus management, keyboard paths, and accessible names.
- Write clear, specific UI copy. No fake metrics, unsupported testimonials, empty buzzwords, dead controls, or meaningless placeholder sections in final deliverables.
- Don't add a feature, page, configuration playground, animation or setting that wasn't requested or justified by a clear user need.

### Identity by context

- **Landing/marketing:** Strong above-the-fold message, impressive **real product artifact**, clear CTA, intentional sections, breathing room, responsive typography. Originality should come from composition, storytelling, imagery, and a few high-quality moments—not excessive motion.
- **SaaS dashboard / developer tool:** Kumo-style density, alignment and component rigor are especially useful. Prioritize scanning, consistent controls, navigation, forms, skeletons, errors, and keyboard ergonomics.
- **Editor / creative tool:** Preserve usable canvas space; avoid competing panels, layout jumps, laggy gestures, and unnecessary visual chrome. Selection, active state, playback, and undo feedback must be obvious and fast.
- **Mobile:** Treat touch targets, keyboard, safe areas, viewport units, sticky composer/footer, scroll ownership and gestures as first-class. No interactions may depend on hover alone.

## 5. Motion — Emil's discipline, not decoration

Before adding any animation ask: **What user question does this answer?** Does it indicate cause and effect, entrance/exit, hierarchy, selection, progress, or spatial continuity? If not, prefer no animation.

- Motion should be interruptible and predictable. Repeated clicking/tapping must never queue a long theatrical sequence.
- Favor composited `transform` and `opacity` where practical; avoid animation-driven layout thrash. Test on lower-end devices if relevant.
- Prefer existing project animation tools; don't add Motion, GSAP, or another dependency solely for a single hover effect.
- Good starting ranges (not laws): hover/press 100–180ms; most UI transitions 160–260ms; larger disclosure/entrance 220–400ms. Adjust to distance, intent and observed feel.
- Use easing that fits the action. Entry should settle naturally, exit should be decisive. Springs need controlled overshoot and correct transform origins.
- Avoid simultaneous scale, blur, glow, stagger, parallax, bouncing and scroll reveals on every element.
- Support `prefers-reduced-motion`; reduce or remove nonessential movement while keeping state changes clear.
- Review animations separately with `review-animations` when available. Any persistent jank is a failed result, not a cosmetic issue.

## 6. React / Next.js engineering standards

- Preserve the project's actual framework and routing conventions. Use TypeScript types, semantic components, and established state/data patterns.
- Keep client boundaries limited; do not turn an entire Next.js page into a client component because one control needs interactivity.
- Prevent unnecessary rendering, heavy initial JS, waterfall fetches, unbounded event listeners, large eagerly imported modules, and image-induced layout shifts.
- Use stable keys, cleanup effects/listeners, accessible forms, meaningful loading and error handling.
- Favor responsive CSS and native capabilities over JS-driven layout unless interaction truly demands JS.
- Optimize fonts and real imagery, provide sensible fallback states, and check performance on mobile.
- Never silently replace the UI library or styling architecture. When choosing a library, document why it fits and what it replaces.
- Keep changes scoped: no unrelated code cleanup, no unrequested data-model/API changes, no breaking edits merely to achieve a visual effect.

## 7. Required quality gate before declaring done

**A successful build is not visual QA.** Test the rendered UI with the available browser/preview tools whenever possible.

### Visual and responsive

- [ ] Check a narrow phone (~375–390px), tablet (~768px), laptop (~1280px) and wider desktop (~1440px+), as applicable.
- [ ] Compare against the reference at matching viewport sizes when fidelity is requested.
- [ ] Check heading wrapping, navigation, section spacing, content widths, image crops, icon alignment, cards and footer.
- [ ] Test dark **and** light themes when supported; catch invisible text, mismatched buttons, or weak secondary contrast.
- [ ] Check overflow with extremely long titles, empty data, dense data, and slow-loading or broken media.

### Interaction and accessibility

- [ ] Exercise main CTA, nav links, inputs, tabs, menus, dialogs, and route transitions; no dead affordances.
- [ ] Verify keyboard order, `focus-visible`, Escape/close behavior, labels, touch targets and mobile interactions.
- [ ] Verify pending, empty, error and success flows; no fake-success states.
- [ ] Verify reduced-motion preference and re-entrant rapid interactions for animated controls.

### Code and product

- [ ] Run the project's applicable typecheck, lint, tests and production build (where tools/dependencies permit).
- [ ] Inspect browser console/runtime errors and avoid obvious React hydration warnings.
- [ ] Check no unintended behavior regressions, no unrelated changed files, and no major layout shifts or jank.
- [ ] If QA tools are unavailable, say **“not visually verified”** rather than claiming tests passed.

**Fix defects found during QA** before polishing unrelated areas. Don't stop at the first successful screenshot.

## 8. Working agreements

1. **Do the actual build** if asked to build. Don't substitute mockups, generic advice or an implementation plan for working code.
2. **Honor fidelity.** If the user asks to copy a design and only change copy, do not redesign it.
3. **Don't chase novelty.** A clean page with one standout interaction beats a page with twenty effects.
4. **Be honest about limitations.** Name which skills, assets, views or interactions could not be accessed or tested.
5. **Do not claim something has been pushed, deployed or tested unless that action truly succeeded.** Push/deploy only when asked or already explicitly authorized.
6. **Show the result.** When possible, provide a verified preview, screenshots, or clear file/route references—not just “done.”
7. **Explain decisions briefly.** Report what changed, why it is better, what was tested, and what is still incomplete.

## 9. Completion report template

Use a concise finish, not a giant self-review:

```text
Implemented: [what screens/components changed]
Design decisions: [1–3 choices that materially improved clarity or polish]
Skills actually used: [names, or "none available; followed AGENTS.md standards"]
Verified: [build/test/browser viewport details that were actually checked]
Remaining: [specific gaps, or "none known"]
```

## 10. Definition of done

A UI task is complete when it satisfies the requested design and behavior, matches the project's chosen visual language, survives realistic mobile and desktop usage, has purposeful interaction states, and passes the available implementation and browser checks. If part of that is blocked, deliver the best supported result **with the blocker stated plainly**.
