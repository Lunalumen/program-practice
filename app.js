const SIZE = 15;
const boardEl = document.querySelector('#board');
const historyEl = document.querySelector('#history');
const undoBtn = document.querySelector('#undo');
const restartBtn = document.querySelector('#restart');
const playAgainBtn = document.querySelector('#play-again');
const modal = document.querySelector('#result-modal');
let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
let moves = [];
let turn = 'black';
let winner = null;

const stars = new Set(['3,3','3,11','7,7','11,3','11,11']);
for (let row = 0; row < SIZE; row++) {
  for (let col = 0; col < SIZE; col++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    if (col === 0) cell.classList.add('edge-left');
    if (col === SIZE - 1) cell.classList.add('edge-right');
    if (row === 0) cell.classList.add('edge-top');
    if (row === SIZE - 1) cell.classList.add('edge-bottom');
    if (stars.has(`${row},${col}`)) cell.innerHTML = '<i></i>';
    cell.dataset.row = row; cell.dataset.col = col;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `${String.fromCharCode(65 + col)}${row + 1} 빈 칸`);
    cell.addEventListener('click', () => placeStone(row, col));
    boardEl.appendChild(cell);
  }
}

function placeStone(row, col) {
  if (winner || board[row][col]) return false;
  board[row][col] = turn;
  moves.push({ row, col, color: turn });
  if (hasFive(row, col, turn)) winner = turn;
  else if (moves.length === SIZE * SIZE) winner = 'draw';
  else turn = turn === 'black' ? 'white' : 'black';
  render();
  if (winner) window.setTimeout(showResult, 220);
  return true;
}

function hasFive(row, col, color) {
  return [[1,0],[0,1],[1,1],[1,-1]].some(([dr, dc]) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === color) {
        count++; r += dr * sign; c += dc * sign;
      }
    }
    return count >= 5;
  });
}

function render() {
  document.querySelectorAll('.cell').forEach((cell) => {
    const row = +cell.dataset.row, col = +cell.dataset.col;
    cell.querySelector('.piece')?.remove();
    const color = board[row][col];
    if (color) {
      const piece = document.createElement('span');
      piece.className = `piece ${color}`;
      if (moves.at(-1)?.row === row && moves.at(-1)?.col === col) piece.classList.add('last');
      cell.appendChild(piece);
      cell.setAttribute('aria-label', `${String.fromCharCode(65 + col)}${row + 1} ${color === 'black' ? '흑돌' : '백돌'}`);
    } else cell.setAttribute('aria-label', `${String.fromCharCode(65 + col)}${row + 1} 빈 칸`);
  });
  const current = turn === 'black' ? '흑돌' : '백돌';
  document.querySelector('#turn-label').textContent = winner ? '대국 종료' : current;
  document.querySelector('#status-text').textContent = winner ? '새 게임으로 다시 시작할 수 있어요.' : `${moves.length + 1}번째 수를 둘 차례입니다.`;
  document.querySelector('#turn-stone').className = `stone ${turn}`;
  document.querySelector('#black-player').classList.toggle('active', !winner && turn === 'black');
  document.querySelector('#white-player').classList.toggle('active', !winner && turn === 'white');
  const blackCount = moves.filter(m => m.color === 'black').length;
  document.querySelector('#black-count').textContent = `${blackCount}수`;
  document.querySelector('#white-count').textContent = `${moves.length - blackCount}수`;
  document.querySelector('#move-total').textContent = `${moves.length}수`;
  undoBtn.disabled = moves.length === 0 || !!winner;
  historyEl.innerHTML = moves.length ? moves.map((m, i) => `<li><span class="num">${i + 1}</span><span>${m.color === 'black' ? '흑돌' : '백돌'}</span><span class="coord">${String.fromCharCode(65 + m.col)}${m.row + 1}</span></li>`).reverse().join('') : '<li class="empty">아직 둔 수가 없습니다.</li>';
}

function undo() {
  if (!moves.length || winner) return;
  const last = moves.pop(); board[last.row][last.col] = null; turn = last.color; render();
}
function reset() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null)); moves = []; turn = 'black'; winner = null; modal.hidden = true; render();
}
function showResult() {
  const isDraw = winner === 'draw';
  document.querySelector('#winner-stone').hidden = isDraw;
  document.querySelector('#winner-stone').className = `stone large ${winner === 'white' ? 'white' : 'black'}`;
  document.querySelector('#result-title').textContent = isDraw ? '무승부' : `${winner === 'black' ? '흑돌' : '백돌'} 승리!`;
  document.querySelector('#result-copy').textContent = isDraw ? '모든 칸을 채웠습니다.' : `${moves.length}수 만에 오목을 완성했습니다.`;
  modal.hidden = false; playAgainBtn.focus();
}
undoBtn.addEventListener('click', undo); restartBtn.addEventListener('click', reset); playAgainBtn.addEventListener('click', reset);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) reset(); });

const context = document.modelContext;
if (context?.registerTool) {
  context.registerTool({
    name: 'place_stone', title: '오목돌 놓기', description: '현재 차례의 돌을 지정한 오목판 좌표에 놓습니다.',
    inputSchema: { type: 'object', properties: { row: { type: 'integer', minimum: 1, maximum: 15 }, column: { type: 'integer', minimum: 1, maximum: 15 } }, required: ['row','column'], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) { const row = Number(input?.row) - 1, col = Number(input?.column) - 1; if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= SIZE || col >= SIZE) throw new Error('좌표는 1부터 15 사이의 정수여야 합니다.'); if (!placeStone(row, col)) throw new Error('이미 돌이 있거나 대국이 끝난 자리입니다.'); return { placed: true, row: row + 1, column: col + 1, winner }; }
  });
}
render();
