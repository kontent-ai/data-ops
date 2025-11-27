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
    image: ({ value }) => <strong>[image: {value.asset._ref}]</strong>,
    table: ({ value }) => <TableComponent {...value} />,
  },
  marks: {
    contentItemLink: ({ value, children }) => (
      <strong>
        [item-link: {value?.contentItemLink._ref}] {children}
      </strong>
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
