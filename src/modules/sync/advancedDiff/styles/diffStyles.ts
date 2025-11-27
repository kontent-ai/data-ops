export const diffStyles = `
    body {
        font-family: Arial, sans-serif;
        height: auto;
        width: 100vw;
        margin: auto;
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
    .env, .added-and-deleted {
        display: flex;
    }
    .environment-info {
        margin: 10px 0;
        font-size: x-large;
        display: flex;
    }
    .environment-info div {
        border-radius: 20px;
        padding: 9px 16px;
        margin-right: 5px;
        font-size: small;
        font-family: 'Courier New', Courier, monospace;
        color: black;
        border: 1px solid rgb(223, 223, 223);
        align-content: center;
        max-width: 420px;
    }
    .environment-info div.env-type, .elementType {
        background: black;
        color: white;
        font-family: Arial, sans-serif;
        border-radius: 30px;
        font-size: xx-small;
        font-weight: bold;
        text-align: center;
    }
    .environment-info a, .elementDetail {
        background: #5b4ff5;
        color: white;
        border-radius: 20px;
        font-size: x-small;
        font-weight: bold;
        text-align: center;
        text-decoration: none;
        align-content: center;
        padding: 9px 16px;
    }
    .environment-info a.disabled {
        display: none;
    }
    .environment-info.arrow {
        align-self: center;
    }
    .push {
        margin-left: auto;
    }
    .entity-section {
        margin: 10px 0;
        border-radius: 16px;
        padding: 10px;
        border: #ccc solid 1px;
        box-shadow: rgba(0, 0, 0, 0.03) 0px 0px 8px;
        background-color: white;
    }
    .entity-section-header {
        display: flex;
        justify-content: stretch;
        width: 100%;
        position: sticky;
        top: 50px;
        background-color: white;
        cursor: pointer;
    }
    .entity-section-header div {
        font-size: large;
        font-weight: bold;
        padding: 15px;
        align-content: center;
        margin-right: 10px;
    }
    .num-added {
        color: #005f3c;
        min-width: 2em;
        text-align: center;
    }
    .num-modified {
        color: #5b4ff5;
        min-width: 2em;
        text-align: center;
    }
    .num-removed {
        color: #ff005c;
        min-width: 2em;
        text-align: center;
    }
    .entity-section-content {
        margin-top: 5px;
        border-radius: 16px;
    }
    details.entity-section > summary,
    details.entity-detail > summary,
    details.element > summary {
        list-style: none;
    }
    details.entity-section > summary::-webkit-details-marker,
    details.entity-detail > summary::-webkit-details-marker,
    details.element > summary::-webkit-details-marker {
        display: none;
    }

    .entity-section-content > .op {
        padding-left: 1em;
    }

    .entity-detail {
        border: 1px solid #ccc;
        border-radius: 16px;
        margin-bottom: 5px;
        padding-left: 10px;
        padding-right: 10px;
    }
    .added {
        border: 1px solid #005f3c;
        border-radius: 16px;
        margin-left: 5px;
        padding: 16px;
        flex: 1;
    }
    .added h3 {
        color: #005f3c;
    }
    .added h4 {
        font-family: 'Courier New', Courier, monospace;
    }
    .updated {
        border: 1px solid #5b4ff5;
        border-radius: 16px;
        padding: 16px;
        margin-top: 10px;
        margin-bottom: 10px;
    }
    .updated h3 {
        color: #5b4ff5;
    }
    .updated h4 {
        font-family: 'Courier New', Courier, monospace;
        cursor: pointer;
    }
    .deleted {
        border: 1px solid #ff005c;
        border-radius: 16px;
        margin-right: 5px;
        padding: 16px;
        flex: 1;
    }
    .deleted h3 {
        color: #ff005c;
    }
    .deleted h4 {
        font-family: 'Courier New', Courier, monospace;
    }
    pre {
        padding: 10px;
        overflow-x: clip;
    }
    .title {
        display: flex;
        align-items: center;
        font-size: 2em;
        margin-bottom: 1em;
    }
    .title img {
        height: 3em;
        margin-right: 0.5em;
    }
    .title .logo {
        display: flex;
        align-items: center;
    }
    .timestamp {
        font-size: medium;
    }
    .content {
        padding-top: 2em;
        padding-left: 8em;
        padding-right: 8em;
        margin: auto;
    }
    .diffContainer {
        margin-top: 2em;
    }
    .compared-environments {
        display: flex;
        justify-content: space-between;
        position: sticky;
        top: 0px;
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
    }
    .element {
        flex: 3;
        padding: 5px 5px 5px 40px;
        border-radius: 16px;
        border: 1px solid #ccc;
        text-align: left;
    }
    .element div {
        border-radius: 16px;
        border: 1px solid #ccc;
    }
    .comparator {
        flex: 1;
        font-size: x-large;
        border: none;
        text-align: center;
        align-self: center;
    }
    .added-element {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: smaller;
        margin-bottom: 5px;
        font-family: 'Courier New', Courier, monospace;
        margin-left: 1em;
    }
    .added-element .element {
        cursor: pointer;
    }
    .added-element .element div {
        font-family: Arial, Helvetica, sans-serif;
        border: none;
        padding: 5px 0 0 5px;
    }
    .element-type {
        flex: 1;
        color: white;
        background-color: #005f3c;
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
    .entity-name {
        font-size: smaller;
        font-family: 'Courier New', Courier, monospace;
        padding: 1em;
        cursor: pointer;
        font-weight: bold;
    }
    .entity-name.removed {
        cursor: unset;
    }
    .entity-operations {
        padding: 0 0 1rem 1rem;
        font-size: smaller;
        font-family: Arial, Helvetica, sans-serif;
    }
    .entity-operations .div {
        font-family: Arial, Helvetica, sans-serif;
    }
    .op p {
        text-indent: -1em;
    }
    .op .add {
        text-align: right;
    }
    .op .remove {
        text-align: left;
    }
    .modifier-icon {
        font-size: large;
        font-weight: bold;
        padding-right: 1em;
    }
    .compared-elements:hover .element {
        border-color: #5b4ff5;
    }
    .compared-elements .element {
        transition: all 0.5s ease;
    }
    .warning, .term {
        font-size: small;
    }
    ul > li::marker {
        content: none;
    }
    ul ul li::marker {
        color:#005f3c;
        content: '➥ ';
        font-weight: bold;
    }
    li {
        padding-top: 5px;
    }
`;
