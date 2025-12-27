const AVATAR_EMOJIS = [
  "🐱",
  "🐶",
  "🐰",
  "🐸",
  "🦊",
  "🐯",
  "🦄",
  "🐝",
  "🐮",
  "🐻",
  "🦁",
  "🐯",
  "🦊",
  "🐰",
  "🐱",
  "🦄",
  "🐝",
  "🦉",
  "🦇",
  "🐳",
  "🦎",
  "🐻",
  "🦜",
  "🦝",
  "🐸",
  "🐰",
  "🦌",
  "🐣",
  "🐨",
  "🦏",
  "🦥",
];

const getAvatarEmoji = (name: string): string => {
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_EMOJIS[index % AVATAR_EMOJIS.length];
};

export { getAvatarEmoji };
