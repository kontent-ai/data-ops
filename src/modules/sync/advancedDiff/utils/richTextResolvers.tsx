import { transformToPortableText } from "@kontent-ai/rich-text-resolver";
import {
  PortableText,
  type PortableTextReactResolvers,
  TableComponent,
} from "@kontent-ai/rich-text-resolver-react";
import type { ReactNode } from "react";

const diffResolvers: PortableTextReactResolvers = {
  types: {
    componentOrItem: ({ value }) => (
      <strong>
        [{value.componentOrItem.dataType ?? "item"}: {value.componentOrItem._ref}]
      </strong>
    ),
    image: ({ value }) => {
      const url = value.asset.url;
      if (url && url !== "#") {
        return <img src={url} alt={value.asset.alt ?? ""} className="rt-image" />;
      }
      return <strong>[image: {value.asset._ref}]</strong>;
    },
    table: ({ value }) => <TableComponent {...value} />,
  },
  marks: {
    contentItemLink: ({ value, children }) => (
      <span className="item-link">
        {children} <span className="ref-badge">{value?.contentItemLink._ref}</span>
      </span>
    ),
    link: ({ value, children }) => <a href={value?.href}>{children}</a>,
  },
};

const isHtml = (value: string): boolean => /<[a-z][\s\S]*?>/i.test(value);

export const renderRichTextValue = (value: string): ReactNode => {
  if (!isHtml(value)) {
    return value;
  }

  const portableText = transformToPortableText(value);

  return <PortableText value={portableText} components={diffResolvers} />;
};
