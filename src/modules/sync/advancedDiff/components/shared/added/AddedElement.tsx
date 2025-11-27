import type { ContentTypeElements } from "@kontent-ai/management-sdk";

import { AddedObjectProperties } from "./AddedObjectProperties.js";

type AddedElementProps = Readonly<{
  element: ContentTypeElements.Element;
}>;

export const AddedElement = ({ element }: AddedElementProps) => (
  <div className="added-element">
    <details className="element">
      <summary>{element.codename}</summary>
      <AddedObjectProperties object={element} />
    </details>
    <div className="element-type">{element.type.toUpperCase().replaceAll("_", " ")}</div>
  </div>
);
