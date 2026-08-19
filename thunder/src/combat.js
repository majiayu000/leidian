// 碰撞处理: 玩家子弹 vs 敌人 / 敌弹与敌体 vs 玩家 / 道具拾取 / 炸弹
import * as bullets from './bullets.js';
import * as enemies from './enemies.js';
import * as fx from './particles.js';
import { sfx } from './sound.js';

export function useBomb(game) {
  game.player.bombs--;
  sfx.bomb();
  game.flash = 0.9;
  game.shake = 0.6;
  const list = enemies.list;
  for (let j = list.length - 1; j >= 0; j--) {
    const e = list[j];
    if (e.type === 'boss') e.hp -= 20;
    killEnemy(game, j);
  }
  bullets.clearEnemyBullets();
}

export function process(game) {
  const player = game.player;
  const pb = bullets.playerBullets();
  const list = enemies.list;
  for (let i = pb.length - 1; i >= 0; i--) {
    const b = pb[i];
    for (let j = 0; j < list.length; j++) {
      const e = list[j];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const rr = e.r + b.r;
      if (dx * dx + dy * dy < rr * rr) {
        e.hp -= b.dmg;
        pb.splice(i, 1);
        if (e.hp <= 0) killEnemy(game, j);
        break;
      }
    }
  }

  if (player.alive && player.inv <= 0) {
    const eb = bullets.enemyBullets();
    for (let i = eb.length - 1; i >= 0; i--) {
      const b = eb[i];
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const rr = player.r + b.r;
      if (dx * dx + dy * dy < rr * rr) {
        eb.splice(i, 1);
        hitPlayer(game);
        break;
      }
    }
    if (player.alive && player.inv <= 0) {
      for (let j = enemies.list.length - 1; j >= 0; j--) {
        const e = enemies.list[j];
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const rr = e.r + player.r;
        if (dx * dx + dy * dy < rr * rr) {
          killEnemy(game, j);
          hitPlayer(game);
          break;
        }
      }
    }
  }

  const pks = bullets.pickupList();
  for (let i = pks.length - 1; i >= 0; i--) {
    const p = pks[i];
    if (!player.alive) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (dx * dx + dy * dy < 26 * 26) {
      pks.splice(i, 1);
      sfx.pickup();
      if (p.kind === 'P') {
        if (player.power < 5) player.power++;
        else game.score += 500;
      } else {
        player.bombs = Math.min(5, player.bombs + 1);
      }
    }
  }
}

export function killEnemy(game, index) {
  const e = enemies.list[index];
  if (!e) return;
  enemies.list.splice(index, 1);
  game.score += e.score;
  if (e.type === 'boss') {
    fx.explosion(e.x, e.y, '#ffb3c1', 70, 460);
    fx.ring(e.x, e.y, '#ffd0df', 130);
    sfx.bossDie();
    game.shake = 0.9;
    bullets.clearEnemyBullets();
  } else {
    fx.explosion(e.x, e.y, e.color, e.type === 'tank' ? 28 : 14, 280);
    sfx.explode(e.type === 'tank');
    const roll = Math.random();
    if (roll < 0.1) bullets.dropPickup(e.x, e.y, 'P');
    else if (roll < 0.15) bullets.dropPickup(e.x, e.y, 'B');
  }
}

function hitPlayer(game) {
  const player = game.player;
  player.lives--;
  fx.explosion(player.x, player.y, '#7fd8ff', 30, 320);
  fx.ring(player.x, player.y, '#bfeaff', 80);
  sfx.explode(true);
  game.shake = 0.5;
  player.alive = false;
  if (player.lives > 0) player.deadTimer = 1.2;
  else game.gameOverAt = game.time + 1.6;
}
