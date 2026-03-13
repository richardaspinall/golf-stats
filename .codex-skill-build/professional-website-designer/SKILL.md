---
name: "professional-website-designer"
description: "Design polished, professional marketing websites, landing pages, portfolio sites, and product pages with strong visual hierarchy, conversion-focused layouts, responsive behavior, and implementation-ready direction. Use when Codex needs to shape a website's visual direction, structure a page, improve an existing frontend's design quality, or turn a brief into a refined web experience."
---

# Professional Website Designer

## Overview

Design websites that feel intentional, premium, and credible. Translate vague briefs into a clear visual system, strong page structure, and implementation-ready guidance that a frontend agent can build without inventing the design.

## Workflow

1. Define the brief before drawing anything.
   - Identify the site's goal, audience, primary action, tone, and content constraints.
   - Infer missing details from the product category, but state the assumptions.
2. Choose a visual direction.
   - Pick a design concept in plain language such as editorial, corporate premium, modern SaaS, technical minimal, or bold campaign.
   - Commit to a distinct direction instead of averaging multiple styles together.
3. Build the page hierarchy.
   - Decide the order of sections based on persuasion and user needs.
   - Make the hero, proof, offer, and call to action obvious within a fast scan.
4. Define the system.
   - Specify typography, spacing rhythm, color roles, surface treatments, and motion rules.
   - Use CSS variables or token names when producing implementation guidance.
5. Adapt for responsive behavior.
   - Reflow complex layouts cleanly for tablet and mobile.
   - Preserve hierarchy and call to action prominence on smaller screens.
6. Audit before delivery.
   - Check for generic layouts, weak contrast, overcrowding, inconsistent spacing, and missing states.
   - Tighten copy placement, alignment, and interaction cues before considering the design complete.

## Required Output

When creating or redesigning a site, provide:

- A short design concept statement.
- A concise palette and typography direction.
- A section-by-section page structure.
- Notes on key components and interaction behavior.
- Responsive adjustments for mobile.
- Clear implementation guidance if code will be written next.

If the user asks for code, keep the design direction strong enough that implementation does not drift into a default template.

## Design Rules

### Visual Direction

- Prefer one sharp concept over a bland compromise.
- Match the visual language to the brand and audience.
- Avoid stock startup aesthetics unless the brief clearly calls for them.
- Make whitespace intentional; premium pages usually breathe more than teams expect.

### Typography

- Establish a visible hierarchy with contrast in size, weight, and spacing.
- Pair expressive heading typography with a highly readable body font choice.
- Keep line lengths controlled; long text blocks should not stretch across the page.
- Use typographic rhythm to separate sections before adding extra decoration.

### Color and Surfaces

- Assign colors to roles: background, text, accent, border, and highlight.
- Use contrast to direct attention, not just to decorate.
- Combine flat color with gradients, tints, texture, or layered surfaces when the concept benefits from depth.
- Avoid muddy palettes and low-contrast UI chrome.

### Layout

- Start from content priority, not from a preselected component library.
- Mix full-width moments, constrained copy blocks, and asymmetric layouts where appropriate.
- Let hero sections earn attention through composition, not only oversized text.
- Break repetition across sections so the page does not feel templated.

### Components

- Buttons, cards, testimonials, pricing blocks, and nav bars should share the same visual language.
- Add hover, focus, and active states whenever interactive UI is described.
- Keep forms short, scannable, and visually calm.
- Use icons, dividers, and badges sparingly; each element must support hierarchy.

### Motion

- Use motion to reinforce structure: staged reveals, section transitions, image drift, or hover emphasis.
- Keep animations subtle and purposeful.
- Never let animation reduce readability or delay primary actions.

## Page Planning Heuristics

### Landing Page

- Lead with the value proposition, proof, and primary action.
- Follow with benefits, product detail, objections, and a closing call to action.

### Company or Professional Site

- Build trust early with positioning, work quality, credentials, and social proof.
- Let the about, services, and contact sections feel coherent rather than assembled from separate templates.

### Product Marketing Page

- Balance storytelling with product clarity.
- Use screenshots, feature groupings, and comparison framing to reduce cognitive load.

## Working With Existing Frontends

When redesigning an existing page:

1. Audit what is working before replacing it.
2. Preserve sound structure and rewrite only the weak visual decisions.
3. Keep implementation proportional to the requested change.
4. Respect existing design systems unless the user is clearly asking for a broader visual reset.

## Frontend Handoff

If implementation follows, instruct the builder to:

- Define reusable tokens for color, spacing, radius, shadow, and type.
- Preserve the chosen visual concept through the final code.
- Avoid default fonts, default spacing scales, and interchangeable section patterns.
- Verify the result on desktop and mobile before delivery.

## Quality Bar

Do not stop at "clean." Aim for a site that looks professionally art-directed, trustworthy, and deliberate. If the output feels generic, overly safe, or indistinguishable from a starter template, revise the concept, hierarchy, and typography until it has a point of view.
