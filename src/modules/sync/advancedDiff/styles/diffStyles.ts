export const diffStyles = `
    :root {
        --color-added: #005f3c;
        --color-modified: #5b4ff5;
        --color-removed: #ff005c;
        --color-added-bg: #f0faf5;
        --color-removed-bg: #fff5f8;
        --color-modified-bg: #f5f3ff;
        --color-border: #ccc;
        --color-border-light: rgb(223, 223, 223);
        --font-mono: 'Courier New', Courier, monospace;
        --sidebar-width: 240px;
    }

    html {
        scroll-behavior: smooth;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: Arial, sans-serif;
        height: auto;
        width: 100vw;
        margin: 0;
        max-width: 3000px;
        position: relative;
    }

    h1 {
        font-size: 1.5em;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
    }

    h2 {
        font-size: 1.2em;
        margin-top: 20px;
    }

    pre {
        padding: 10px;
        overflow-x: clip;
    }

    li {
        padding-top: 5px;
    }

    ul {
        & > li::marker {
            content: none;
        }

        & ul li::marker {
            color: var(--color-added);
            content: '➥ ';
            font-weight: bold;
        }
    }

    .content {
        padding-top: 2em;
        padding-left: calc(var(--sidebar-width) + 4em);
        padding-right: 4em;
        margin: auto;
    }

    .title {
        display: flex;
        align-items: center;
        font-size: 2em;
        margin-bottom: 1em;

        & img {
            height: 3em;
            margin-right: 0.5em;
        }

        & .logo {
            display: flex;
            align-items: center;
        }
    }

    .diffContainer {
        margin-top: 2em;
    }

    .timestamp {
        font-size: medium;
    }

    .timestamp-pill {
        font-size: 0.4em;
        background: #f0f0f0;
        border-radius: 20px;
        padding: 4px 12px;
        margin-left: 1em;
        font-weight: normal;
        color: #666;
        white-space: nowrap;
    }

    .push {
        margin-left: auto;
    }

    .env {
        display: flex;
    }

    .environment-info {
        margin: 10px 0;
        font-size: x-large;
        display: flex;

        & div {
            border-radius: 20px;
            padding: 9px 16px;
            margin-right: 5px;
            font-size: small;
            font-family: var(--font-mono);
            color: black;
            border: 1px solid var(--color-border-light);
            align-content: center;
            max-width: 420px;

            &.env-type {
                background: black;
                color: white;
                font-family: Arial, sans-serif;
                border-radius: 30px;
                font-size: xx-small;
                font-weight: bold;
                text-align: center;
            }
        }

        & a {
            background: var(--color-modified);
            color: white;
            border-radius: 20px;
            font-size: x-small;
            font-weight: bold;
            text-align: center;
            text-decoration: none;
            align-content: center;
            padding: 9px 16px;

            &.disabled {
                display: none;
            }
        }

        &.arrow {
            align-self: center;
        }
    }

    .elementType {
        background: black;
        color: white;
        font-family: Arial, sans-serif;
        border-radius: 30px;
        font-size: xx-small;
        font-weight: bold;
        text-align: center;
    }

    .elementDetail {
        background: var(--color-modified);
        color: white;
        border-radius: 20px;
        font-size: x-small;
        font-weight: bold;
        text-align: center;
        text-decoration: none;
        align-content: center;
        padding: 9px 16px;
    }

    .compared-environments {
        display: flex;
        justify-content: space-between;
        background-color: white;
        align-items: stretch;
        z-index: 100;
    }

    .compared-elements {
        display: flex;
        justify-content: space-between;
        background-color: white;
        align-items: stretch;
        margin-bottom: 1rem;
        margin-top: 3px;
        font-size: small;

        & .element {
            transition: all 0.5s ease;
        }

        &:hover .element {
            border-color: var(--color-modified);
        }
    }

    .comparator {
        flex: 1;
        font-size: x-large;
        border: none;
        text-align: center;
        align-self: center;
    }

    .entity-section {
        margin: 10px 0;
        border-radius: 16px;
        padding: 10px;
        border: var(--color-border) solid 1px;
        box-shadow: rgba(0, 0, 0, 0.03) 0px 0px 8px;
        background-color: white;
        display: none;
    }

    .entity-section:target {
        display: block;
    }

    .diffContainer:not(:has(.entity-section:target)) > .entity-section:first-of-type {
        display: block;
    }

    .entity-section-header {
        display: flex;
        justify-content: stretch;
        width: 100%;
        background-color: white;

        & div {
            font-size: large;
            font-weight: bold;
            padding: 15px;
            align-content: center;
            margin-right: 10px;
        }
    }

    .entity-section-content {
        margin-top: 5px;
        border-radius: 16px;

        & > .op {
            padding-left: 1em;
        }
    }

    .entity-detail {
        border: 1px solid var(--color-border);
        border-radius: 16px;
        margin-bottom: 5px;
        padding-left: 10px;
        padding-right: 10px;
    }

    .entity-name {
        font-size: smaller;
        font-family: var(--font-mono);
        padding: 1em;
        cursor: pointer;
        font-weight: bold;

        &.removed {
            cursor: unset;
        }
    }

    .entity-operations {
        padding: 0 0 1rem 1rem;
        font-size: smaller;
        font-family: Arial, Helvetica, sans-serif;

        & div {
            font-family: Arial, Helvetica, sans-serif;
        }
    }

    .num-added {
        color: var(--color-added);
        min-width: 2em;
        text-align: center;
    }

    .num-modified {
        color: var(--color-modified);
        min-width: 2em;
        text-align: center;
    }

    .num-removed {
        color: var(--color-removed);
        min-width: 2em;
        text-align: center;
    }

    .added {
        border: 1px solid var(--color-added);
        border-radius: 16px;
        padding: 16px;
        margin-top: 10px;
        margin-bottom: 10px;

        & h3 {
            color: var(--color-added);
        }

        & h4 {
            font-family: var(--font-mono);
        }
    }

    .updated {
        border: 1px solid var(--color-modified);
        border-radius: 16px;
        padding: 16px;
        margin-top: 10px;
        margin-bottom: 10px;

        & h3 {
            color: var(--color-modified);
        }

        & h4 {
            font-family: var(--font-mono);
            cursor: pointer;
        }
    }

    .deleted {
        border: 1px solid var(--color-removed);
        border-radius: 16px;
        padding: 16px;
        margin-top: 10px;
        margin-bottom: 10px;

        & h3 {
            color: var(--color-removed);
        }

        & h4 {
            font-family: var(--font-mono);
        }
    }

    .element {
        flex: 3;
        padding: 5px 5px 5px 40px;
        border-radius: 16px;
        border: 1px solid var(--color-border);
        text-align: left;

        & div {
            border-radius: 16px;
            border: 1px solid var(--color-border);
        }
    }

    .added-element {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: smaller;
        margin-bottom: 5px;
        font-family: var(--font-mono);
        margin-left: 1em;

        & .element {
            cursor: pointer;

            & div {
                font-family: Arial, Helvetica, sans-serif;
                border: none;
                padding: 5px 0 0 5px;
            }
        }
    }

    .element-type {
        flex: 1;
        color: white;
        background-color: var(--color-added);
        border-radius: 16px;
        align-self: stretch;
        padding: 5px;
        margin-left: 5px;
        text-align: center;
        font-size: x-small;
        font-weight: bold;
        font-family: Arial, Helvetica, sans-serif;
        align-content: center;
    }

    .op {
        & p {
            text-indent: -1em;
        }

        & .add {
            text-align: right;
        }

        & .remove {
            text-align: left;
        }
    }

    .modifier-icon {
        font-size: large;
        font-weight: bold;
        padding-right: 1em;
    }

    details.entity-detail > summary,
    details.element > summary {
        list-style: none;

        &::-webkit-details-marker {
            display: none;
        }
    }

    .warning, .term {
        font-size: small;
    }

    .entity-detail > div > .term:first-child {
        margin-block-start: 0;
    }

    .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: var(--sidebar-width);
        height: 100vh;
        background: #fafafa;
        border-right: 1px solid var(--color-border-light);
        z-index: 200;
        font-size: 15px;
        overflow-y: auto;
        padding-top: 2em;
    }

    .sidebar a {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 1em;
        border-left: 3px solid transparent;
        text-decoration: none;
        color: #333;
        transition: background 0.15s, border-color 0.15s;
    }

    .sidebar a:hover {
        background: #f0f0f0;
    }

    .sidebar a.active {
        background: var(--color-modified-bg);
        border-left-color: var(--color-modified);
        font-weight: bold;
    }

    .nav-counts {
        display: flex;
        gap: 4px;
        font-size: 12px;
        font-weight: bold;
    }

    .c-add { color: var(--color-added); }
    .c-mod { color: var(--color-modified); }
    .c-rem { color: var(--color-removed); }

    .prop-diff-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 13px;
        margin: 6px 0 16px 0;
    }

    .prop-diff-table th {
        text-align: left;
        padding: 4px 10px;
        font-weight: bold;
        border-bottom: 2px solid var(--color-border-light);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #666;
        background: transparent;
    }

    .prop-diff-table th:first-child { width: 20%; }
    .prop-diff-table th:nth-child(2) { width: 40%; }
    .prop-diff-table th:nth-child(3) { width: 40%; }

    .prop-diff-table td {
        padding: 5px 10px;
        vertical-align: top;
        overflow-wrap: break-word;
        word-break: break-word;
        border-bottom: 1px solid var(--color-border-light);
    }

    .prop-name {
        font-family: var(--font-mono);
        font-weight: bold;
        font-size: 13px;
    }

    .prop-old {
        background: var(--color-removed-bg);
        font-family: var(--font-mono);
        font-size: 13px;
        border-radius: 3px;
        white-space: pre-wrap;
    }

    .prop-new {
        background: var(--color-added-bg);
        font-family: var(--font-mono);
        font-size: 13px;
        border-radius: 3px;
        white-space: pre-wrap;
    }

    .element-node {
        border-left: 3px solid var(--color-border-light);
        margin: 14px 0;
        border-radius: 0 8px 8px 0;
        background: #fafafa;
        transition: background 0.15s ease;

        &:hover { background: #f5f5f5; }
    }

    .element-node--modified { border-left-color: var(--color-modified); }

    .element-node-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: bold;
        user-select: none;
    }

    .element-node-header .en-counts {
        display: flex;
        gap: 6px;
        font-size: 11px;
        margin-left: auto;
        flex-shrink: 0;
    }

    .element-node-content {
        padding: 4px 12px 12px 12px;
        font-size: 13px;
    }

    .element-node-toggle {
        font-size: 9px;
        color: #999;
        transition: transform 0.15s ease;
        flex-shrink: 0;
    }

    .element-node[open] > .element-node-header .element-node-toggle {
        transform: rotate(90deg);
    }

    details.element-node > summary {
        list-style: none;

        &::-webkit-details-marker { display: none; }
    }

    .moves-group {
        margin: 16px 0;
    }

    .moves-group-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: bold;
        margin-bottom: 4px;
        color: #5b9bd5;
    }

    .moves-group .op {
        font-size: 12px;
        padding: 2px 0;
    }

    .array-changes {
        margin: 16px 0;
    }

    .array-changes-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: bold;
        margin-bottom: 4px;
        color: var(--color-modified);
    }

    .array-changes-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 13px;
    }

    .array-changes-table th:first-child { width: 20%; }
    .array-changes-table th:nth-child(2) { width: 40%; }
    .array-changes-table th:nth-child(3) { width: 40%; }

    .array-changes-table th {
        text-align: left;
        padding: 4px 10px;
        font-weight: bold;
        border-bottom: 2px solid var(--color-border-light);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #666;
    }

    .array-changes-table td {
        padding: 5px 10px;
        vertical-align: top;
        overflow-wrap: break-word;
        word-break: break-word;
        border-bottom: 1px solid var(--color-border-light);
    }

    .array-values {
        font-family: var(--font-mono);
        font-size: 13px;
        border-radius: 3px;
    }

    .array-values--added {
        background: var(--color-added-bg);
    }

    .array-values--removed {
        background: var(--color-removed-bg);
    }

    .move-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 13px;
        margin-top: 4px;
    }

    .move-table th:first-child { width: 30%; }
    .move-table th:nth-child(2) { width: 15%; }
    .move-table th:nth-child(3) { width: 55%; }

    .move-table th {
        text-align: left;
        padding: 4px 10px;
        font-weight: bold;
        border-bottom: 2px solid var(--color-border-light);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #666;
    }

    .move-table td {
        padding: 5px 10px;
        vertical-align: top;
        border-bottom: 1px solid var(--color-border-light);
    }

    .move-item {
        font-family: var(--font-mono);
    }

    .move-reference {
        font-family: var(--font-mono);
    }

    .move-badge {
        display: inline-block;
        font-size: 11px;
        font-weight: bold;
        padding: 1px 8px;
        border-radius: 10px;
        text-transform: lowercase;
    }

    .move-badge--after {
        background: var(--color-modified-bg);
        color: var(--color-modified);
    }

    .move-badge--before {
        background: var(--color-added-bg);
        color: var(--color-added);
    }

    .elements-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: bold;
        color: #888;
        margin-top: 16px;
        margin-bottom: 4px;
    }

    .move-badge--under {
        background: #fff8e6;
        color: #996600;
    }

    .elements-grid {
        margin-top: 8px;
    }

    .elements-grid-header {
        display: grid;
        grid-template-columns: 40% 20% 15% 25%;
        padding: 6px 10px;
        background: #f5f5f5;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        font-weight: bold;
        color: #666;
    }

    .elements-grid-row > summary {
        display: grid;
        grid-template-columns: 40% 20% 15% 25%;
        padding: 6px 10px;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 13px;
        border-bottom: 1px solid var(--color-border-light);
        list-style: none;
        transition: background 0.1s ease;
    }

    .elements-grid-row > summary::-webkit-details-marker { display: none; }
    .elements-grid-row > summary:hover { background: #f9f9f9; }
    .elements-grid-row[open] > summary { background: #f5f5f5; }

    .elements-grid-detail {
        padding: 10px 10px 10px 20px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        background: #fafafa;
        border-bottom: 2px solid var(--color-border-light);
    }

    .detail-props-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        font-size: 12px;
    }

    .detail-props-table td:first-child { width: 30%; }
    .detail-props-table td:nth-child(2) { width: 70%; }

    .detail-props-table td {
        text-align: left;
        padding: 3px 8px;
        border-bottom: 1px solid var(--color-border-light);
        font-family: var(--font-mono);
        font-size: 12px;
        overflow-wrap: break-word;
        word-break: break-word;
    }

    .rt-image {
        max-width: 150px;
        max-height: 100px;
        border: 1px solid var(--color-border-light);
        border-radius: 4px;
        display: block;
        margin: 4px 0;
    }

    .item-link {
        color: var(--color-added);
    }

    .ref-badge {
        font-size: 0.85em;
        color: #666;
        font-family: var(--font-mono);
    }

    .type-badge {
        display: inline-block;
        background: var(--color-added);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        font-family: Arial, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
`;
