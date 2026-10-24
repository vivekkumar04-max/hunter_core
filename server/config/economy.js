export const FOCUS_DURATION_SECONDS = 40 * 60;
export const WALLET_CAP = 30;
export const LEVELS = [
  { level: 1, name: "Newbie Hunter", cost: 0, dailyCap: 6 },
  { level: 2, name: "Awakened", cost: 10, dailyCap: 7 },
  { level: 3, name: "Elite Hunter", cost: 14, dailyCap: 8 },
  { level: 4, name: "Shadow Monarch", cost: 20, dailyCap: 9 },
  { level: 5, name: "S-Rank Hunter", cost: 28, dailyCap: 10 }
];
export const levelFor = (level) => LEVELS.find((item) => item.level === level) || {
  level, name: `Hunter Rank ${level}`, cost: 28 + (level - 5) * 10, dailyCap: 10 + (level - 5)
};
