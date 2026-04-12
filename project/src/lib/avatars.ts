export const DEFAULT_AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Aiden&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Jamal&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Maria&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Chen&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Priya&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Alex&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Zoe&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=David&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Fatima&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Kenji&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Sofia&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Omar&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Maya&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Jason&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Aisha&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Lucas&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Kim&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Diego&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Emma&backgroundColor=d1d4f9"
];

export const getRandomAvatar = () => {
  const index = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[index];
};
