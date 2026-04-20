# Accessibility Report

This project uses the redesigned UI with a strict color palette, keyboard-visible focus states, reduced-motion handling, and mobile-friendly navigation.

## Contrast Notes

- Primary maroon `#91191C` is used for emphasis on light surfaces where it remains readable and intentional.
- Secondary navy `#242A52` is used for structure, headers, and text on light backgrounds.
- CTA pink `#ED145B` is reserved for high-priority actions and paired with white text for strong contrast.
- Light grey `#F5F5F5` and off-white `#FDF9FD` are used as section surfaces to preserve readability.
- Dark mode swaps to light text on darker surfaces to maintain legibility.

## Keyboard Path Checklist

- `Tab` reaches the skip link on each major page.
- `Tab` moves through navigation, form controls, and action buttons in a predictable order.
- Focus states are visible on links, buttons, inputs, and selects.
- Submit and verify actions are accessible via keyboard without requiring pointer input.
- Mobile bottom navigation remains available without blocking primary content.

## Motion and Interaction

- Smooth scrolling is enabled for section jumps.
- Reduced-motion users get a minimal animation experience.
- CTA buttons use a subtle magnetic effect, but remain operable with keyboard and touch.

## Verified Pages

- Home / landing page
- Registration page
- Admin login page
- Admin dashboard
- QR verification page

## Notes

- Backend endpoints were not changed.
- Cypress smoke tests cover the registration and admin verification flows.
