export const DEFAULT_AVATARS = [
  // "Male" / Masculine / Generic Seeds
  "https://api.dicebear.com/9.x/micah/svg?seed=Felix&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/micah/svg?seed=Aneka&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/micah/svg?seed=Leo&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/micah/svg?seed=Oliver&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/micah/svg?seed=Sammy&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/micah/svg?seed=Oscar&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/micah/svg?seed=Jack&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/micah/svg?seed=Nala&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/micah/svg?seed=Milo&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/micah/svg?seed=Caleb&backgroundColor=c0aede",
  
  // "Female" / Feminine Seeds
  "https://api.dicebear.com/9.x/micah/svg?seed=Sasha&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/micah/svg?seed=Lily&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/micah/svg?seed=Midnight&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/micah/svg?seed=Mia&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/micah/svg?seed=Lola&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/micah/svg?seed=Jasmine&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/micah/svg?seed=Zoe&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/micah/svg?seed=Chloe&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/micah/svg?seed=Abby&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/micah/svg?seed=Bella&backgroundColor=d1d4f9"
];

export const getRandomAvatar = () => {
  const index = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[index];
};
