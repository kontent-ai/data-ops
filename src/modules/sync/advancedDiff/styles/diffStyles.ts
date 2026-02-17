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

    .env, .added-and-deleted {
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
        cursor: pointer;

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
        margin-left: 5px;
        padding: 16px;
        flex: 1;

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
        margin-right: 5px;
        padding: 16px;
        flex: 1;

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

    details.entity-section > summary,
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
`;
