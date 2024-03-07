// TODO: This file is justa suggestion. Feel free to come up with your idea :)

export const handleName = (name: string) => ({
  op: "replace",
  path: "/name",
  value: name,
});

export const contentTypePropertyHandlers = {
  name: handleName,
};
