const JAPANESE = /[ぁ-んァ-ヶ一-龠々]/;
const JAPANESE_GLOBAL = /[ぁ-んァ-ヶ一-龠々ー]+/g;

const exactTranslations: Record<string, string> = {
  'W, A, S, D または 矢印キー で操縦': 'Use W, A, S, D or the arrow keys to steer',
  'SPACE キー でレーザー射撃': 'Press SPACE to fire lasers',
  'SPACE または ENTER を押してシステム起動': 'Press SPACE or ENTER to start',
  'ENTER を押してリブート': 'Press ENTER to restart',
  'マウスを動かすか、キーボード操作でスタート': 'Move the mouse or use the keyboard to start',
  'クリック または 画面タップ でゲームスタート': 'Click or tap to start',
  'クリックまたはタップしてゲーム開始': 'Click or tap to start',
  '画面をクリックしてテスト開始': 'Click the screen to start',
  '画面をクリックしてもう一度プレイ': 'Click the screen to play again',
  '画面をクリックしてリトライ': 'Click the screen to retry',
  '画面クリックでリスタート': 'Click the screen to restart',
  'クリックでリスタート': 'Click to restart',
  'クリックしてリトライ': 'Click to retry',
  'クリックまたはタップでリスタート': 'Click or tap to restart',
  'クリックまたはタップしてリスタート': 'Click or tap to restart',
  'クリックまたはタップで再起動': 'Click or tap to restart',
  'クリックまたはタップで再挑戦': 'Click or tap to try again',
  'クリックして再挑戦': 'Click to try again',
  'クリックして再試行': 'Click to try again',
  'クリックして再接続': 'Click to reconnect',
  'クリックして新しいパズルをロードします': 'Click to load a new puzzle',
  'クリックして最初からプレイ': 'Click to play from the beginning',
  'クリックして次のステージへ': 'Click for the next stage',
  'クリックして次のレベルへ': 'Click for the next level',
  'クリックして次のお題へ': 'Click for the next challenge',
  'クリックして次の単語へ': 'Click for the next word',
  'クリックして次に進む': 'Click to continue',
  '画面クリックで次のステージへ': 'Click the screen for the next stage',
  '画面クリックで次のレベルへ': 'Click the screen for the next level',
  '画面をクリックして次へ': 'Click the screen to continue',
  '画面クリックで最初からリスタート': 'Click the screen to restart from the beginning',
  '画面クリックで次のステージへ進む →': 'Click the screen for the next stage →',
  'クリックで最初からリスタート': 'Click to restart from the beginning',
  'クリックで次のステージへ進む →': 'Click for the next stage →',
  'リスタートボタンを押して再戦してください': 'Press Restart to play again',
  'リスタートボタンを押して再挑戦': 'Press Restart to try again',
  'リスタートボタンを押して再起動します': 'Press Restart to start again',
  'リスタートボタンを押すと再起動します': 'Press Restart to start again',
  '「リスタート」ボタンまたは Enterキー で再挑戦': 'Press Restart or ENTER to try again',
  'スペースキー、クリックまたはタップで再起動': 'Press SPACE, click, or tap to restart',
  'キーボードのSPACE、クリックまたはタップで再起動': 'Press SPACE, click, or tap to restart',
  'クリック / タップ または スペースキーでリスタート': 'Click, tap, or press SPACE to restart',
  'クリック / タップでリスタート': 'Click or tap to restart',
  '正しい英単語になるように文字を入れ替えよう！': 'Rearrange the letters to make the correct English word!',
  'すべてのライトを消去（ダーク化）してください': 'Turn off every light',
  'グリッドに潜む敵艦を探索せよ': 'Find the enemy ships hidden in the grid',
  'ドットを繋げて正方形を作ろう！': 'Connect the dots to make squares!',
  '数字の端同士が一致するようにドミノを並べよう！': 'Match the numbers on the ends of the dominoes!',
  '1から100までの任意の数字を予想してください': 'Guess a number from 1 to 100',
  '配置するブロックを選択:': 'Choose a block:',
  '配置するカード:': 'Card to place:',
  'ルール：': 'RULES:',
  '山札': 'DECK',
  'あなたのターンです': 'YOUR TURN',
  'AIのターンです': "AI'S TURN",
  'おめでとうございます！': 'CONGRATULATIONS!',
  'パズルクリア！すべてのライトをオフにしました。': 'PUZZLE CLEARED! All lights are off.',
  'コードの解読に成功しました！': 'CODE DECRYPTED!',
  'ネオンコアの修復に成功しました！': 'NEON CORE RESTORED!',
};

function numbersFrom(value: string) {
  return value.match(/-?\d+(?:\.\d+)?/g)?.join(' / ') || '';
}

function contextualTranslation(value: string, title: string) {
  const numbers = numbersFrom(value);

  if (/サイバー[・\s]|パズル$|ゲーム$/.test(value) && !/[をでにへして]/.test(value)) return title || 'MINI GAME';
  if (/ゲームオーバー|敗北|負け|失敗|崩壊|限界/.test(value)) return numbers ? `GAME OVER · ${numbers}` : 'GAME OVER';
  if (/勝利|クリア|成功|完了|達成|解読しました|防衛しました/.test(value)) return numbers ? `SUCCESS! · ${numbers}` : 'SUCCESS!';
  if (/リスタート|リトライ|再挑戦|再起動|再戦|もう一度/.test(value)) return 'Click or tap to restart';
  if (/次のステージ|次のレベル|次のお題|次の暗号|次の単語|次に進/.test(value)) return 'Click or tap to continue';
  if (/ゲームスタート|ゲーム開始|テスト開始|システム起動/.test(value)) return 'Click or tap to start';
  if (/クリック|タップ|ドラッグ/.test(value)) return 'Click, tap, or drag to play';
  if (/最終スコア|スコア/.test(value)) return numbers ? `SCORE: ${numbers}` : 'SCORE';
  if (/最高コンボ|コンボ/.test(value)) return numbers ? `BEST COMBO: ${numbers}` : 'BEST COMBO';
  if (/試行回数|手数|残りの試行/.test(value)) return numbers ? `MOVES: ${numbers}` : 'MOVES';
  if (/残り|残ストーン/.test(value)) return numbers ? `REMAINING: ${numbers}` : 'REMAINING';
  if (/ステージ/.test(value)) return numbers ? `STAGE: ${numbers}` : 'STAGE';
  if (/レベル/.test(value)) return numbers ? `LEVEL: ${numbers}` : 'LEVEL';
  if (/ターン/.test(value)) return /AI/.test(value) ? "AI'S TURN" : 'YOUR TURN';
  if (/あなたの手札/.test(value)) return numbers ? `YOUR HAND · ${numbers}` : 'YOUR HAND';
  if (/AIの手札/.test(value)) return numbers ? `AI HAND · ${numbers}` : 'AI HAND';
  if (/失点/.test(value)) return numbers ? `PENALTY: ${numbers}` : 'PENALTY';
  if (/正解|答え/.test(value)) return numbers ? `ANSWER: ${numbers}` : 'CORRECT ANSWER';
  if (/間違|不正解/.test(value)) return 'TRY AGAIN';
  if (/目標/.test(value)) return numbers ? `TARGET: ${numbers}` : 'TARGET';
  if (/初期値/.test(value)) return numbers ? `START: ${numbers}` : 'START';
  if (/回収/.test(value)) return numbers ? `COLLECTED: ${numbers}` : 'COLLECTED';
  if (/ルール|方法|操作|選択|指定|揃|並べ|探|移動|入力|接続|解除|一致/.test(value)) return 'Follow the game rules shown in the Controls panel';

  return '';
}

export function translateCanvasText(text: unknown, lang: string, title = '') {
  const value = String(text);
  if (lang !== 'en' || !JAPANESE.test(value)) return value;

  const exact = exactTranslations[value.trim()];
  if (exact) return exact;

  const contextual = contextualTranslation(value, title);
  if (contextual) return contextual;

  const asciiRemainder = value
    .replace(JAPANESE_GLOBAL, ' ')
    .replace(/[「」『』【】（）]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s*\)/g, '')
    .trim();
  return /[A-Za-z0-9]/.test(asciiRemainder) ? asciiRemainder : 'GAME INFO';
}

function isClearMessage(text: string) {
  const value = text.trim();
  return /クリア(?:[！!]|$)|勝利(?:[！!]|$)|成功(?:しました)?(?:[！!]|$)|完了(?:[！!]|$)|おめでとう|全ステージ制覇|全問正解/.test(value)
    || /\b(?:YOU WIN|PLAYER WINS|RACE WON|VICTORY|SUCCESS|CONGRATULATIONS|EXCELLENT|ACCESS GRANTED|MAINFRAME HACKED|MATRIX DECRYPTED|SIGNAL HARMONIZED)\b/i.test(value)
    || /^(?!(?:LINES?|BLOCKS?|ROWS?|COLUMNS?)\b).*(?:CLEAR|CLEARED|COMPLETE|SOLVED)[!！]*$/i.test(value);
}

function scoreFromCanvasText(text: string) {
  const normalized = text.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/(?:SCORE|POINTS?|DISTANCE(?: RAN)?|HEIGHT(?:\s+TITLE)?|TOTAL BLOCKS|CORES?|(?:FINAL\s+)?SIZE|スコア|得点|距離|高さ|回収したコア)\s*[:：]?\s*(\d[\d ]*)/i);
  if (!match) return null;
  const score = Number(match[1].replace(/\s/g, ''));
  return Number.isFinite(score) ? score : null;
}

export function installCanvasTextI18n(
  canvas: HTMLCanvasElement,
  lang: string,
  title = '',
  onClear?: () => void,
  scoreTarget = 0,
  onScore?: (score: number) => void,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || (ctx as any).__miniGamesEnglishTextInstalled) return;

  const fillText = ctx.fillText.bind(ctx);
  const strokeText = ctx.strokeText.bind(ctx);
  const measureText = ctx.measureText.bind(ctx);
  let clearReported = false;
  const prepareText = (text: string) => {
    const score = scoreFromCanvasText(text);
    if (score !== null) {
      onScore?.(score);
      if (!clearReported && scoreTarget > 0 && score >= scoreTarget) {
        clearReported = true;
        onClear?.();
      }
    }
    if (!clearReported && isClearMessage(text)) {
      clearReported = true;
      onClear?.();
    }
    return translateCanvasText(text, lang, title);
  };
  ctx.fillText = ((text: string, x: number, y: number, maxWidth?: number) => {
    const translated = prepareText(String(text));
    if (maxWidth === undefined) fillText(translated, x, y);
    else fillText(translated, x, y, maxWidth);
  }) as typeof ctx.fillText;
  ctx.strokeText = ((text: string, x: number, y: number, maxWidth?: number) => {
    const translated = prepareText(String(text));
    if (maxWidth === undefined) strokeText(translated, x, y);
    else strokeText(translated, x, y, maxWidth);
  }) as typeof ctx.strokeText;
  ctx.measureText = ((text: string) => measureText(translateCanvasText(text, lang, title))) as typeof ctx.measureText;
  (ctx as any).__miniGamesEnglishTextInstalled = true;
}
