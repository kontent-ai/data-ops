import type { ReactNode } from "react";

type EntityPathRenderer = {
  regex: RegExp;
  render: (() => ReactNode) | ((match: string[]) => ReactNode);
};

export const renderTaxonomyPath = (pathSegments: ReadonlyArray<string>): ReactNode => {
  const extractedTerms = pathSegments.map((s) => s.split(":")[1]);
  const leadingTerms = extractedTerms.slice(0, -1);
  const lastTerm = extractedTerms.at(-1);
  const titleText = extractedTerms.join(" » ");

  return (
    <span title={titleText}>
      {leadingTerms.join(" » ")}
      {leadingTerms.length > 0 && " » "}
      <strong>{lastTerm}</strong>
    </span>
  );
};

export const renderTaxonomyPropertyPath = (propertyPath: string): ReactNode | null => {
  const termMatches = [...propertyPath.matchAll(/terms\/codename:([^/]+)/g)];
  if (termMatches.length === 0) {
    return null;
  }

  const terms = termMatches.map((m) => m[1]);
  const leadingTerms = terms.slice(0, -1);
  const lastTerm = terms.at(-1);

  if (!lastTerm) {
    return null;
  }

  const lastMatch = termMatches.at(-1) as RegExpExecArray; // we already chcecked if termMatches is not empty
  const remainder = propertyPath.slice(lastMatch.index + lastMatch[0].length);
  const trailingProp = remainder.replace("/", " / ");

  const titleText =
    trailingProp.length > 0 ? `${terms.join(" » ")} / ${trailingProp}` : terms.join(" » ");

  return (
    <span title={titleText}>
      {leadingTerms.join(" » ")}
      {leadingTerms.length > 0 && " » "}
      <strong>{lastTerm}</strong>
      {trailingProp && ` / ${trailingProp}`}
    </span>
  );
};

export const renderEntityPath = (
  renderers: ReadonlyArray<EntityPathRenderer>,
  path: string,
): ReactNode => {
  for (const candidate of renderers) {
    candidate.regex.lastIndex = 0;
    const match = path.match(candidate.regex);
    if (match) {
      return candidate.render(match);
    }
  }
  return <strong>{path}</strong>;
};

export const replaceEntityPathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^\/name$/,
    render: () => (
      <>
        Property <strong>name</strong>
      </>
    ),
  },
  {
    regex: /^\/collections$/,
    render: () => <>Collection for space</>,
  },
  {
    regex: /^\/codename$/,
    render: () => (
      <>
        Property <strong>codename</strong>
      </>
    ),
  },
  {
    regex: /^\/codename:([^/]+)/,
    render: (match: string[]) => <strong>{match[1]}</strong>,
  },
  {
    regex: /^\/scopes\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Scope <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/fallback_language$/,
    render: () => (
      <>
        Property <strong>fallback_language</strong>
      </>
    ),
  },
  {
    regex: /^\/steps\/codename:([^/]+)\/color$/,
    render: (match: string[]) => (
      <>
        Color for step <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/([^/]+)$/,
    render: (match: string[]) => (
      <>
        Property <strong>{match[2]}</strong> of element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)\/name$/,
    render: (match: string[]) => (
      <>
        Content group <strong>{match[1]}</strong> name
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)\/([^/]+)$/,
    render: (match: string[]) => (
      <>
        Property <strong>{match[3]}</strong> of multiple choice option <strong>{match[2]}</strong>{" "}
        on element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
];

export const addEntityPathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^\/elements$/,
    render: () => <>Element</>,
  },
  {
    regex: /^\/content_groups$/,
    render: () => <>Content group</>,
  },
  {
    regex: /^\/terms$/,
    render: () => <>Top level term</>,
  },
  {
    regex: /steps$/,
    render: () => <>Step</>,
  },
  {
    regex: /scopes$/,
    render: () => <>Scope with the following configuration →</>,
  },
  {
    regex: /^\/steps\/codename:([^/]+)\/transitions_to$/,
    render: (match: string[]) => (
      <>
        Transition from step <strong>{match[1]}</strong> to step
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_content_types$/,
    render: (match: string[]) => (
      <>
        For element <strong>{match[1]}</strong>, allowed content type
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_elements$/,
    render: (match: string[]) => (
      <>
        For custom element <strong>{match[1]}</strong>, allowed element
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options$/,
    render: (match: string[]) => (
      <>
        For multiple choice element <strong>{match[1]}</strong>, option
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_blocks$/,
    render: (match: string[]) => (
      <>
        For rich text element <strong>{match[1]}</strong>, allowed block
      </>
    ),
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_formatting$/,
    render: (match: string[]) => (
      <>
        For rich text element <strong>{match[1]}</strong>, allowed formatting
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_text_blocks$/,
    render: (match: string[]) => (
      <>
        For rich text element <strong>{match[1]}</strong>, allowed text block
      </>
    ),
  },
];

export const removeEntityPathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^\/elements\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Content group <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_content_types\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Allowed content type <strong>{match[2]}</strong> for element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_elements\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Allowed element <strong>{match[2]}</strong> for custom element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Option <strong>{match[2]}</strong> for multiple choice element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_table_formatting\/([^/]+)$/,
    render: (match: string[]) => (
      <>
        Allowed table formatting <strong>{match[2]}</strong> for rich text element{" "}
        <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_formatting\/([^/]+)$/,
    render: (match: string[]) => (
      <>
        Allowed formatting <strong>{match[2]}</strong> for rich text element{" "}
        <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_text_blocks\/([^/]+)$/,
    render: (match: string[]) => (
      <>
        Allowed formatting <strong>{match[2]}</strong> for rich text element{" "}
        <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_table_text_blocks\/([^/]+)$/,
    render: (match: string[]) => (
      <>
        Allowed table text block <strong>{match[2]}</strong> for rich text element{" "}
        <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_blocks\/([^/]+)$/,
    render: (match: string[]) => (
      <>
        Allowed block <strong>{match[2]}</strong> for rich text element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/steps\/codename:([^/]+)\/transitions_to\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Transition from step <strong>{match[1]}</strong> to step <strong>{match[2]}</strong>
      </>
    ),
  },
  {
    regex: /^\/steps\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Step <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/codename:([^/]+)/,
    render: (match: string[]) => <strong>{match[1]}</strong>,
  },
];

export const moveEntityPathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^\/elements\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Option <strong>{match[2]}</strong> for multiple choice element <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        Content group <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
  {
    regex: /^\/codename:([^/]+)/,
    render: (match: string[]) => <strong>{match[1]}</strong>,
  },
];

export const elementMovePathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^options\/codename:([^/]+)$/,
    render: (match: string[]) => (
      <>
        <strong>{match[1]}</strong>
      </>
    ),
  },
  {
    regex: /^codename:([^/]+)/,
    render: (match: string[]) => (
      <>
        <strong>{match[1]}</strong>
      </>
    ),
  },
];

export const modifierIcons = {
  addInto: <span className="num-added modifier-icon">+</span>,
  move: <span className="num-modified modifier-icon">⤷</span>,
  remove: <span className="num-removed modifier-icon">−</span>,
  replace: <span className="num-modified modifier-icon">⇄</span>,
} as const;
