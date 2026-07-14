const replacements: Array<[RegExp, string]> = [
  [/サイバー[・\s]?/g, ''],
  [/ネオン[・\s]?/g, ''],
  [/ランダム/g, 'ばらばら'],
  [/ターゲット/g, 'まと'],
  [/グリッド/g, 'マス'],
  [/ディスク/g, 'コマ'],
  [/オブジェクト/g, 'もの'],
  [/正確に/g, 'うまく'],
  [/素早く/g, 'すばやく'],
  [/消去/g, '消す'],
  [/構成/g, '作る'],
  [/制限時間/g, '時間'],
  [/駆け引き/g, 'かけひき'],
  [/反射神経/g, 'すばやさ'],
  [/戦略/g, '作戦'],
  [/高度な/g, '楽しい'],
  [/本格/g, 'しっかり遊べる'],
];

const specialCopy: Record<string, { ja: string; en: string }> = {
  'blackjack-v2': { ja: 'カードの合計を21に近づけよう。21をこえたら負け！', en: 'Get your cards close to 21 without going over.' },
  sudoku: { ja: 'たて・よこ・四角に、1〜9を一つずつ入れよう。', en: 'Place 1–9 once in every row, column, and box.' },
  minesweeper: { ja: '数字をヒントに、ばくだんのないマスを全部ひらこう。', en: 'Use the numbers to open every safe square.' },
  tictactoe: { ja: '○と×を交代で置き、先に3つならべよう。', en: 'Take turns and line up three marks first.' },
  'neon-pong-v2': { ja: 'バーを動かしてボールを打ち返そう。', en: 'Move your paddle and send the ball back.' },
  'word-search-v2': { ja: '文字の中にかくれた言葉を見つけよう。', en: 'Find the words hidden in the letter grid.' },
  'math-quiz-v2': { ja: '出てくる計算に、できるだけ早く答えよう。', en: 'Solve each math question as quickly as you can.' },
  'reaction-timer-v2': { ja: '合図が出たらすぐタップ。速さにちょうせん！', en: 'Tap as soon as the signal appears.' },
  'slot-machine-v2': { ja: 'ボタンを押して、同じマークをそろえよう。', en: 'Spin and match the same symbols.' },
  'cyber-wave-harmonizer': { ja: '3つのつまみを動かして、一致率を90%以上にしよう。', en: 'Adjust the three sliders until the match reaches 90%.' },
  simon: { ja: '光った順番をおぼえて、同じように押そう。', en: 'Remember the lights and repeat the pattern.' },
};

function tidy(text: string) {
  return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text)
    .replace(/[（(][^)）]+[)）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const hasJapanese = (value: string) => /[ぁ-んァ-ヶ一-龠々]/.test(value);

function titleFromId(id: string) {
  const acronyms: Record<string, string> = { '3d': '3D', ai: 'AI', rpsls: 'RPSLS', qpyramid: 'Q Pyramid', qix: 'Qix' };
  return id.split('-').map((word) => acronyms[word] || (word === 'v2' ? 'V2' : word.charAt(0).toUpperCase() + word.slice(1))).join(' ')
    .replace(/Tictactoe/g, 'Tic-Tac-Toe')
    .replace(/Blackjack/g, 'Blackjack');
}

export function simpleGameTitle(title: string, lang = 'ja', id = '') {
  if (lang === 'en') return hasJapanese(title) && id ? titleFromId(id) : title;
  return tidy(title).replace(/V2$/i, '').trim();
}

export function simpleGameDescription(
  id: string,
  description: string,
  lang = 'ja',
) {
  const special = specialCopy[id];
  if (special) return lang === 'en' ? special.en : special.ja;

  if (lang === 'en') {
    if (hasJapanese(description)) {
      const name = titleFromId(id);
      if (/word|typing|anagram|crossword|hangman/.test(id)) return `Play a quick word challenge and find the right answer.`;
      if (/math|number|binary|abacus|make-/.test(id)) return `Solve the number challenge and aim for a perfect score.`;
      if (/memory|simon|pattern|sequence/.test(id)) return `Remember the pattern and repeat it in the right order.`;
      if (/runner|shooter|dodge|asteroids|invaders|racer|highway/.test(id)) return `Move fast, avoid danger, and chase a high score.`;
      if (/card|poker|solitaire|blackjack|baccarat|hearts|spades/.test(id)) return `Play a short card challenge with simple browser controls.`;
      return `Learn the simple rules of ${name} and aim for the best score.`;
    }
    const firstSentence = description.split(/(?<=[.!?])\s+/)[0] || description;
    return firstSentence.length > 92 ? `${firstSentence.slice(0, 89).trim()}…` : firstSentence;
  }

  const clean = tidy(description).replace(/！+/g, '！');
  const firstSentence = clean.split('。')[0];
  const chunks = firstSentence.split('、');
  let result = '';

  for (const chunk of chunks) {
    const candidate = result ? `${result}、${chunk}` : chunk;
    if (candidate.length > 46) break;
    result = candidate;
  }

  if (!result) result = firstSentence.slice(0, 43);
  result = result.replace(/[、,\s]+$/g, '');
  if (!/[！!?。]$/.test(result)) result += result.endsWith('ゲーム') ? 'です。' : 'しよう。';
  return result;
}
