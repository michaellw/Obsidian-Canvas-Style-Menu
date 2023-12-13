export const menuItems: string[] = [
    "{ class: 'cs-border', type: 'border', icon: 'box-select', title: 'Border' }",
    "{ class: 'cs-bg', type: 'bg', icon: 'background', title: 'Background' }",
    "{ class: 'cs-rotate', type: 'rotate', icon: 'rotate-cw', title: 'Rotate' }",
    "{ class: 'cs-shape', type: 'shape', icon: 'diamond', title: 'Shape' }",
    "{ class: 'cs-highlight', type: 'highlight', icon: 'star', title: 'Highlight' }",
    "{ class: 'cs-extra', type: 'extra', icon: 'more-horizontal', title: 'Extra' }",
    "{ cat: 'edge', class: 'cs-lineType', type: 'lineType', icon: 'line-type', title: 'Line Type' }",
    "{ cat: 'edge', class: 'cs-lineThickness', type: 'lineThickness', icon: 'equal', title: 'Line thickness' }",
];

export const subMenuItems: string[] = [
    "{ class: 'cs-border-none', type: 'border', icon: 'no-border', title: 'No border' }",
    "{ class: 'cs-border-dashed', type: 'border', icon: 'box-select', title: 'Dashed' }",
    "{ class: 'cs-bg-transparent', type: 'bg', icon: 'transparent', title: 'Transparent' }",
    "{ class: 'cs-bg-opacity-0', type: 'bg', icon: 'opacity', title: 'Opacity 0' }",
    "{ class: 'cs-rotate-right-45', type: 'rotate', icon: 'redo', title: 'Right 45' }",
    "{ class: 'cs-rotate-right-90', type: 'rotate', icon: 'redo', title: 'Right 90' }",
    "{ class: 'cs-rotate-left-45', type: 'rotate', icon: 'undo', title: 'Left 45' }",
    "{ class: 'cs-rotate-left-90', type: 'rotate', icon: 'undo', title: 'Left 90' }",
    "{ class: 'cs-shape-circle', type: 'shape', icon: 'circle', title: 'Circle' }",
    "{ class: 'cs-shape-parallelogram-right', type: 'shape', icon: 'parallelogram-right', title: 'Parallelogram right' }",
    "{ class: 'cs-shape-parallelogram-left', type: 'shape', icon: 'parallelogram-left', title: 'Parallelogram left' }",
    "{ class: 'cs-line-dashed', type: 'lineType', icon: 'line-dashed', title: 'Dashed' }",
    "{ class: 'cs-line-dashed-round', type: 'lineType', icon: 'line-dashed', title: 'Dashed round' }",
    "{ class: 'cs-line-dotted', type: 'lineType', icon: 'line-dotted', title: 'Dotted' }",
    "{ class: 'cs-line-dotted-line', type: 'lineType', icon: 'dotted-line', title: 'Dotted line' }",
    "{ class: 'cs-line-thick', type: 'lineThickness', icon: 'thicker', title: 'Thicker' }",
    "{ class: 'cs-line-thicker', type: 'lineThickness', icon: 'thicker++', title: 'Thicker++' }",
];

export const customIcons: Icon[] = [
    // Lucide Icons
    {
        iconName: "no-border",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mouse-pointer-square-dashed"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="m12 12 4 10 1.7-4.3L22 16Z"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h2"/><path d="M14 3h1"/><path d="M3 9v1"/><path d="M21 9v2"/><path d="M3 14v1"/></svg>`
    },
    {
        iconName: "thicker",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tally-2"><path d="M4 4v16"/><path d="M9 4v16"/></svg>`
    },
    {
        iconName: "thicker++",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tally-3"><path d="M4 4v16"/><path d="M9 4v16"/><path d="M14 4v16"/></svg>`
    },
    // Tabler Icons
    {
        iconName: "background",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-background" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 8l4 -4" /><path d="M14 4l-10 10" /><path d="M4 20l16 -16" /><path d="M20 10l-10 10" /><path d="M20 16l-4 4" /></svg>`
    },
    {
        iconName: "line-type",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-border-style-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 18v.01" /><path d="M8 18v.01" /><path d="M12 18v.01" /><path d="M16 18v.01" /><path d="M20 18v.01" /><path d="M18 12h2" /><path d="M11 12h2" /><path d="M4 12h2" /><path d="M4 6h16" /></svg>`
    },
    {
        iconName: "line-dashed",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-line-dashed" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12h2" /><path d="M17 12h2" /><path d="M11 12h2" /></svg>`
    },
    {
        iconName: "line-dotted",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-line-dotted" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 12v.01" /><path d="M8 12v.01" /><path d="M12 12v.01" /><path d="M16 12v.01" /><path d="M20 12v.01" /></svg>`
    },
    {
        iconName: "dotted-line",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-separator" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12l0 .01" /><path d="M7 12l10 0" /><path d="M21 12l0 .01" /></svg>`
    },
    {
        iconName: "opacity",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-droplet" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546z" /></svg>`
    },
    {
        iconName: "transparent",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-droplet-half-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546z" /><path d="M5 14h14" /></svg>`
    },
    // Custom Icons
    {
        iconName: "parallelogram-right",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4.887 20h11.868c.893 0 1.664 -.665 1.847 -1.592l2.358 -12c.212 -1.081 -.442 -2.14 -1.462 -2.366a1.784 1.784 0 0 0 -.385 -.042h-11.868c-.893 0 -1.664 .665 -1.847 1.592l-2.358 12c-.212 1.081 .442 2.14 1.462 2.366c.127 .028 .256 .042 .385 .042z" /></svg>`
    },
    {
        iconName: "parallelogram-left",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M 19.113,20 H 7.245 C 6.352,20 5.581,19.335 5.398,18.408 L 3.04,6.408 C 2.828,5.327 3.482,4.268 4.502,4.042 A 1.784,1.784 0 0 1 4.887,4 h 11.868 c 0.893,0 1.664,0.665 1.847,1.592 l 2.358,12 c 0.212,1.081 -0.442,2.14 -1.462,2.366 C 19.371,19.986 19.242,20 19.113,20 Z" /></svg>`
    },
    //{iconName: "xxx", svgContent: `yyy`},
];
